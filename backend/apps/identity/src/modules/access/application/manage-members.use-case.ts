import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  MembershipChangeKind,
  MembershipChangedEvent,
  TenantRole,
  type MemberPage,
  type Permission,
} from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { UsersFacade } from '../../users/index.js';
import { TenantAccessRepository } from '../domain/access-store.js';
import type { Group } from '../domain/group.js';
import type { Membership } from '../domain/membership.js';
import type { Role } from '../domain/role.js';
import { AccessVersionPublisher } from './access-version-publisher.js';
import { GrantCeiling } from './grant-ceiling.js';
import { TenantAccessSetup } from './tenant-access-setup.js';

/**
 * Miembros del tenant: listar, quitar y cambiar sus grupos. Un tenant nunca queda sin dueño, y quien edita
 * no toca a un miembro con permisos que él no tiene ni le da grupos que otorguen más que los suyos.
 */
@Injectable()
export class ManageMembers {
  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly users: UsersFacade,
    private readonly setup: TenantAccessSetup,
    private readonly ceiling: GrantCeiling,
    private readonly versions: AccessVersionPublisher,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly clock: Clock,
  ) {}

  async list(tenantId: string): Promise<MemberPage> {
    const memberships = await this.scopes.inTenantShard(tenantId, () =>
      this.tenantAccess.listMemberships(),
    );
    const items = await Promise.all(
      memberships.map(async (membership) => {
        const user = await this.users.getByRef({
          userId: membership.userId,
          homeTenantId: membership.homeTenantId,
        });
        return {
          userId: membership.userId,
          email: user.email,
          displayName: user.displayName,
          groupIds: [...membership.groupIds],
          joinedAt: membership.joinedAt.toISOString(),
        };
      }),
    );
    return { items, nextCursor: null };
  }

  async remove(
    tenantId: string,
    userId: string,
    granted: readonly Permission[],
  ): Promise<void> {
    const removed = await this.change(
      tenantId,
      userId,
      async (membership, groups, roles) => {
        this.ceiling.assertGroups(membership.groupIds, groups, roles, granted);
        this.assertOwnerRemains(
          membership,
          [],
          groups,
          await this.tenantAccess.listMemberships(),
        );
        await this.deleteMembership(tenantId, membership);
        return membership;
      },
    );
    await this.setup.project(tenantId, {
      userId,
      homeTenantId: removed.homeTenantId,
    });
  }

  /**
   * Quita a un usuario que se está borrando de un tenant, sin las reglas de quien edita: el borrado de una
   * cuenta no espera a que el tenant tenga otro dueño. Repetirlo no cambia nada.
   */
  async removeErased(tenantId: string, ref: UserRef): Promise<void> {
    await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.tenantAccess.lockForChanges();
        const membership = await this.tenantAccess.findMembership(ref.userId);
        if (membership !== undefined) {
          await this.deleteMembership(tenantId, membership);
        }
      }),
    );
    await this.setup.project(tenantId, ref);
  }

  async setGroups(
    tenantId: string,
    userId: string,
    groupIds: readonly string[],
    granted: readonly Permission[],
  ): Promise<void> {
    await this.change(tenantId, userId, async (membership, groups, roles) => {
      this.ceiling.assertGroups(membership.groupIds, groups, roles, granted);
      this.ceiling.assertGroups(groupIds, groups, roles, granted);
      this.assertOwnerRemains(
        membership,
        groupIds,
        groups,
        await this.tenantAccess.listMemberships(),
      );
      const next = {
        ...membership,
        groupIds: [...new Set(groupIds)],
        permissionVersion: membership.permissionVersion + 1,
      };
      await this.tenantAccess.updateMembership(next);
      await this.publishMembership(
        tenantId,
        userId,
        MembershipChangeKind.GroupsChanged,
        next.groupIds,
      );
      await this.versions.memberChanged(
        tenantId,
        userId,
        await this.tenantAccess.tenantVersion(),
        next.permissionVersion,
      );
      return next;
    });
  }

  private change<T>(
    tenantId: string,
    userId: string,
    apply: (
      membership: Membership,
      groups: readonly Group[],
      roles: readonly Role[],
    ) => Promise<T>,
  ): Promise<T> {
    return this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.tenantAccess.lockForChanges();
        const membership = await this.tenantAccess.findMembership(userId);
        if (membership === undefined) {
          throw IdentityError.notFound();
        }
        return apply(
          membership,
          await this.tenantAccess.listGroups(),
          await this.tenantAccess.listRoles(),
        );
      }),
    );
  }

  /** @throws IdentityError `IDENTITY.ACCESS.LAST_OWNER` si el cambio deja al tenant sin dueños. */
  private assertOwnerRemains(
    changed: Membership,
    nextGroupIds: readonly string[],
    groups: readonly Group[],
    memberships: readonly Membership[],
  ): void {
    const owners = new Set(
      groups
        .filter((group) => group.systemRole === TenantRole.Owner)
        .map((group) => group.id),
    );
    const isOwner = (ids: readonly string[]): boolean =>
      ids.some((id) => owners.has(id));
    const remaining = memberships.filter((membership) =>
      membership.userId === changed.userId
        ? isOwner(nextGroupIds)
        : isOwner(membership.groupIds),
    );
    if (isOwner(changed.groupIds) && remaining.length === 0) {
      throw new IdentityError(IdentityErrorCode.AccessLastOwner);
    }
  }

  private async deleteMembership(
    tenantId: string,
    membership: Membership,
  ): Promise<void> {
    await this.tenantAccess.deleteMembership(membership.userId);
    await this.publishMembership(
      tenantId,
      membership.userId,
      MembershipChangeKind.Removed,
      [],
    );
    await this.versions.memberChanged(
      tenantId,
      membership.userId,
      await this.tenantAccess.tenantVersion(),
      membership.permissionVersion + 1,
    );
  }

  private async publishMembership(
    tenantId: string,
    userId: string,
    kind: MembershipChangeKind,
    groupIds: readonly string[],
  ): Promise<void> {
    await this.bus.publish(
      MembershipChangedEvent,
      {
        tenantId,
        userId,
        kind,
        groupIds: [...groupIds],
        changedAt: this.clock.now().toISOString(),
      },
      { tenantId },
    );
  }
}
