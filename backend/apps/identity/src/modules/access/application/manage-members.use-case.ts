import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  MembershipChangeKind,
  MembershipChangedEvent,
  TenantRole,
  type Permission,
} from '@contracts/identity';
import { Clock, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { TenantAccessRepository } from '../domain/access-store.js';
import type { Group } from '../domain/group.js';
import type { Membership } from '../domain/membership.js';
import type { Role } from '../domain/role.js';
import { AccessVersionPublisher } from './access-version-publisher.js';
import { GrantCeiling } from './grant-ceiling.js';
import { TenantAccessSetup } from './tenant-access-setup.js';

/**
 * Members of the tenant: remove them and change their groups. A tenant never ends without an owner, and
 * the editor neither touches a member with permissions the editor lacks nor grants groups that give more
 * than the editor's own. A removal keeps the last permission version, so a later return starts above it.
 */
@Injectable()
export class ManageMembers {
  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly setup: TenantAccessSetup,
    private readonly ceiling: GrantCeiling,
    private readonly versions: AccessVersionPublisher,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly clock: Clock,
  ) {}

  /**
   * Removes a member.
   * @param tenantId Tenant.
   * @param userId Member to remove.
   * @param granted Permissions of the editor.
   * @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` if the member holds more than the editor.
   * @throws IdentityError `IDENTITY.ACCESS.LAST_OWNER` if the member is the last owner.
   * @throws IdentityError `PLATFORM.RESOURCE.NOT_FOUND` if the user is not a member.
   */
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
   * Deletes for good the membership of a user whose account is being erased, without the editor rules and
   * without a tombstone. Repeating it changes nothing.
   * @param tenantId Tenant.
   * @param ref Erased user.
   */
  async removeErased(tenantId: string, ref: UserRef): Promise<void> {
    await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.tenantAccess.lockForChanges();
        const membership = await this.tenantAccess.findMembership(ref.userId);
        await this.tenantAccess.purgeMembership(ref.userId);
        if (membership !== undefined) {
          await this.announceRemoval(tenantId, membership);
        }
      }),
    );
    await this.setup.project(tenantId, ref);
  }

  /**
   * Checks that a user can leave a tenant for good: the last owner of a tenant with other members must hand
   * over ownership first, so the deletion of an account never leaves members without an owner.
   * @param tenantId Tenant.
   * @param userId User who leaves.
   * @throws IdentityError `IDENTITY.ACCESS.LAST_OWNER` if they are the last owner and others remain.
   */
  async assertCanLeave(tenantId: string, userId: string): Promise<void> {
    await this.scopes.inTenantShard(tenantId, async () => {
      const membership = await this.tenantAccess.findMembership(userId);
      const memberships = await this.tenantAccess.listMemberships();
      if (membership !== undefined && memberships.length > 1) {
        this.assertOwnerRemains(
          membership,
          [],
          await this.tenantAccess.listGroups(),
          memberships,
        );
      }
    });
  }

  /**
   * Replaces the groups of a member.
   * @param tenantId Tenant.
   * @param userId Member.
   * @param groupIds New groups.
   * @param granted Permissions of the editor.
   * @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` if the member or the groups exceed the editor.
   * @throws IdentityError `IDENTITY.ACCESS.LAST_OWNER` if the change leaves no owner.
   * @throws IdentityError `PLATFORM.RESOURCE.NOT_FOUND` if the user is not a member.
   */
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
    await this.tenantAccess.removeMembership(
      membership.userId,
      membership.permissionVersion + 1,
    );
    await this.announceRemoval(tenantId, membership);
  }

  private async announceRemoval(
    tenantId: string,
    membership: Membership,
  ): Promise<void> {
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
