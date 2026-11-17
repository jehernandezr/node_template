import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  MembershipChangeKind,
  MembershipChangedEvent,
  TenantRole,
} from '@contracts/identity';
import { Clock, IdGenerator, TransactionManager } from '@platform/kernel';
import { MessageBus } from '@platform/messaging';
import { SystemRolePermissions } from '../../../shared/constants/system-roles.constants.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import {
  TenantAccessRepository,
  UserAccessRepository,
} from '../domain/access-store.js';
import type { Membership } from '../domain/membership.js';

/**
 * Prepara el acceso de un tenant nuevo y agrega miembros. La membresía vive en el shard del tenant; la
 * proyección `user_tenants` del shard del usuario se escribe después, en otra transacción, y el evento
 * `MembershipChanged` sale por el outbox para quien la quiera reconstruir.
 */
@Injectable()
export class TenantAccessSetup {
  /** Nombre visible de cada grupo y rol de sistema. */
  static readonly SYSTEM_NAMES: Readonly<Record<TenantRole, string>> = {
    [TenantRole.Owner]: 'Owners',
    [TenantRole.Admin]: 'Admins',
    [TenantRole.Member]: 'Members',
    [TenantRole.Billing]: 'Billing',
  };

  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly userAccess: UserAccessRepository,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /** Crea los roles y grupos de sistema y, si hay dueño, su membresía. Corre en la transacción de quien llama. */
  async setup(tenantId: string, owner?: UserRef): Promise<void> {
    await this.scopes.inTenantShard(tenantId, async () => {
      if ((await this.tenantAccess.listGroups()).length > 0) {
        return;
      }
      for (const role of Object.values(TenantRole)) {
        const roleId = this.ids.next().toString();
        await this.tenantAccess.insertRole({
          id: roleId,
          tenantId,
          name: TenantAccessSetup.SYSTEM_NAMES[role],
          systemRole: role,
          permissions: SystemRolePermissions[role],
        });
        await this.tenantAccess.insertGroup({
          id: this.ids.next().toString(),
          tenantId,
          name: TenantAccessSetup.SYSTEM_NAMES[role],
          systemRole: role,
          roleIds: [roleId],
        });
      }
      await this.tenantAccess.bumpTenantVersion();
      if (owner !== undefined) {
        await this.insertMember(tenantId, owner, [TenantRole.Owner]);
      }
    });
  }

  /**
   * Agrega un miembro con esos grupos, o con el de miembros si no se indica ninguno. Si ya era miembro no
   * cambia nada.
   */
  async addMember(
    tenantId: string,
    ref: UserRef,
    groupIds: readonly string[],
  ): Promise<void> {
    await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.tenantAccess.lockForChanges();
        if (
          (await this.tenantAccess.findMembership(ref.userId)) !== undefined
        ) {
          return;
        }
        const groups = await this.tenantAccess.listGroups();
        const chosen =
          groupIds.length > 0
            ? groupIds
            : groups
                .filter((group) => group.systemRole === TenantRole.Member)
                .map((group) => group.id);
        if (chosen.some((id) => !groups.some((group) => group.id === id))) {
          throw new IdentityError(IdentityErrorCode.InvitationInvalid);
        }
        await this.saveMembership(tenantId, ref, chosen);
      }),
    );
    await this.project(tenantId, ref);
  }

  /** Copia la membresía al shard del usuario. Es idempotente. */
  async project(tenantId: string, ref: UserRef): Promise<void> {
    const membership = await this.scopes.inTenantShard(tenantId, () =>
      this.tenantAccess.findMembership(ref.userId),
    );
    await this.scopes.inUserShard(ref, () =>
      membership === undefined
        ? this.userAccess.removeTenant(ref.userId, tenantId)
        : this.userAccess.projectTenant({
            userId: ref.userId,
            tenantId,
            joinedAt: membership.joinedAt,
          }),
    );
  }

  private async insertMember(
    tenantId: string,
    ref: UserRef,
    roles: readonly TenantRole[],
  ): Promise<void> {
    const groups = await this.tenantAccess.listGroups();
    await this.saveMembership(
      tenantId,
      ref,
      groups
        .filter(
          (group) =>
            group.systemRole !== null && roles.includes(group.systemRole),
        )
        .map((group) => group.id),
    );
  }

  private async saveMembership(
    tenantId: string,
    ref: UserRef,
    groupIds: readonly string[],
  ): Promise<Membership> {
    const membership: Membership = {
      id: this.ids.next().toString(),
      tenantId,
      userId: ref.userId,
      homeTenantId: ref.homeTenantId,
      groupIds,
      permissionVersion: 1,
      joinedAt: this.clock.now(),
    };
    await this.tenantAccess.insertMembership(membership);
    await this.bus.publish(
      MembershipChangedEvent,
      {
        tenantId,
        userId: ref.userId,
        kind: MembershipChangeKind.Added,
        groupIds: [...groupIds],
        changedAt: membership.joinedAt.toISOString(),
      },
      { tenantId },
    );
    return membership;
  }
}
