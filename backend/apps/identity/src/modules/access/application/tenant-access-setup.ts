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
import { AccessVersionPublisher } from './access-version-publisher.js';

/**
 * Prepares the access of a new tenant, adds members and discards the access of a tenant that never
 * activated. The membership lives in the tenant shard; the `user_tenants` projection of the user shard is
 * written afterwards, in another transaction, and `MembershipChanged` leaves through the outbox for whoever
 * rebuilds it. A user who returns after a removal starts above the permission version the removal published.
 */
@Injectable()
export class TenantAccessSetup {
  /** Visible name of each system group and role. */
  static readonly SYSTEM_NAMES: Readonly<Record<TenantRole, string>> = {
    [TenantRole.Owner]: 'Owners',
    [TenantRole.Admin]: 'Admins',
    [TenantRole.Member]: 'Members',
    [TenantRole.Billing]: 'Billing',
  };

  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly userAccess: UserAccessRepository,
    private readonly versions: AccessVersionPublisher,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly bus: MessageBus,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /**
   * Creates the system roles and groups and, if there is an owner, its membership. It runs in the caller's
   * transaction.
   * @param tenantId New tenant.
   * @param owner Owner of the tenant, if any.
   */
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
   * Adds a member with those groups, or with the members group if none is given. If the user is already a
   * member nothing changes.
   * @param tenantId Tenant that gains the member.
   * @param ref New member.
   * @param groupIds Groups of the member.
   * @throws IdentityError `IDENTITY.INVITATION.INVALID` if a group does not exist in the tenant.
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

  /**
   * Copies the membership to the user shard, or removes the copy if the user is no longer a member. It is
   * idempotent.
   * @param tenantId Tenant of the membership.
   * @param ref Member.
   */
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

  /**
   * Deletes the whole access of a tenant that is being discarded: first the projections of its members,
   * then its memberships, groups, roles and versions. Repeating it after a partial run finishes the job.
   * @param tenantId Discarded tenant.
   */
  async discard(tenantId: string): Promise<void> {
    const memberships = await this.scopes.inTenantShard(tenantId, () =>
      this.tenantAccess.listMemberships(),
    );
    for (const membership of memberships) {
      await this.scopes.inUserShard(
        { userId: membership.userId, homeTenantId: membership.homeTenantId },
        () => this.userAccess.removeTenant(membership.userId, tenantId),
      );
    }
    await this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(() => this.tenantAccess.purgeTenant()),
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
    const removedVersion = await this.tenantAccess.removedVersion(ref.userId);
    const membership: Membership = {
      id: this.ids.next().toString(),
      tenantId,
      userId: ref.userId,
      homeTenantId: ref.homeTenantId,
      groupIds,
      permissionVersion: (removedVersion ?? 0) + 1,
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
    if (removedVersion !== undefined) {
      await this.versions.memberChanged(
        tenantId,
        ref.userId,
        await this.tenantAccess.tenantVersion(),
        membership.permissionVersion,
      );
    }
    return membership;
  }
}
