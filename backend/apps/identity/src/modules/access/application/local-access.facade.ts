import { Injectable } from '@nestjs/common';
import type {
  Permission,
  PermissionsChangedPayload,
  UserAccess,
} from '@contracts/identity';
import type { Actor } from '@platform/auth';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { MemberTombstones } from '../domain/member-tombstones.js';
import type { UserTenant } from '../domain/user-tenant.js';
import { AccessFacade } from './access.facade.js';
import { RefreshTenantAccess } from './refresh-tenant-access.use-case.js';
import { AccessResolver } from './access-resolver.js';
import { AccessVersionPublisher } from './access-version-publisher.js';
import { GrantCeiling } from './grant-ceiling.js';
import { ManageMembers } from './manage-members.use-case.js';
import { TenantAccessSetup } from './tenant-access-setup.js';

/** `AccessFacade` inside the process. */
@Injectable()
export class LocalAccessFacade extends AccessFacade {
  constructor(
    private readonly resolver: AccessResolver,
    private readonly setup: TenantAccessSetup,
    private readonly ceiling: GrantCeiling,
    private readonly refresh: RefreshTenantAccess,
    private readonly members: ManageMembers,
    private readonly versions: AccessVersionPublisher,
    private readonly tombstones: MemberTombstones,
  ) {
    super();
  }

  /** {@inheritDoc AccessFacade.resolve} */
  override resolve(userId: string, tenantId: string): Promise<UserAccess> {
    return this.resolver.resolve(userId, tenantId);
  }

  /** {@inheritDoc AccessFacade.isMember} */
  override isMember(userId: string, tenantId: string): Promise<boolean> {
    return this.resolver.isMember(userId, tenantId);
  }

  /** {@inheritDoc AccessFacade.defaultTenant} */
  override defaultTenant(ref: UserRef): Promise<string> {
    return this.resolver.defaultTenant(ref);
  }

  /** {@inheritDoc AccessFacade.requiresMfaOnEveryLogin} */
  override requiresMfaOnEveryLogin(
    ref: UserRef,
    tenantId: string,
  ): Promise<boolean> {
    return this.resolver.requiresMfaOnEveryLogin(ref, tenantId);
  }

  /** {@inheritDoc AccessFacade.addMember} */
  override addMember(
    tenantId: string,
    ref: UserRef,
    groupIds: readonly string[],
    seatLimit?: number,
  ): Promise<void> {
    return this.setup.addMember(tenantId, ref, groupIds, seatLimit);
  }

  /** {@inheritDoc AccessFacade.memberPermissions} */
  override memberPermissions(
    tenantId: string,
    userId: string,
  ): Promise<readonly Permission[]> {
    return this.resolver.memberPermissions(tenantId, userId);
  }

  /** {@inheritDoc AccessFacade.assertGroupsWithin} */
  override assertGroupsWithin(
    tenantId: string,
    groupIds: readonly string[],
    granted: readonly Permission[],
  ): Promise<void> {
    return this.ceiling.assertGroupsWithin(tenantId, groupIds, granted);
  }

  /** {@inheritDoc AccessFacade.assertCanGrantGroups} */
  override assertCanGrantGroups(
    tenantId: string,
    actor: Actor | undefined,
    groupIds: readonly string[],
  ): Promise<void> {
    return this.ceiling.assertActorCanGrantGroups(tenantId, actor, groupIds);
  }

  /** {@inheritDoc AccessFacade.setupTenant} */
  override setupTenant(tenantId: string, owner?: UserRef): Promise<void> {
    return this.setup.setup(tenantId, owner);
  }

  /** {@inheritDoc AccessFacade.projectMembership} */
  override projectMembership(tenantId: string, ref: UserRef): Promise<void> {
    return this.setup.project(tenantId, ref);
  }

  /** {@inheritDoc AccessFacade.tenantsOf} */
  override tenantsOf(ref: UserRef): Promise<readonly UserTenant[]> {
    return this.resolver.tenantsOf(ref);
  }

  /** {@inheritDoc AccessFacade.reserveDepartures} */
  override async reserveDepartures(ref: UserRef): Promise<readonly string[]> {
    const reserved: string[] = [];
    try {
      for (const { tenantId } of await this.resolver.tenantsOf(ref)) {
        if (await this.members.reserveDeparture(tenantId, ref.userId)) {
          reserved.push(tenantId);
        }
      }
    } catch (error) {
      await this.releaseDepartures(ref, reserved);
      throw error;
    }
    return reserved;
  }

  /** {@inheritDoc AccessFacade.releaseDepartures} */
  override async releaseDepartures(
    ref: UserRef,
    tenantIds: readonly string[],
  ): Promise<void> {
    for (const tenantId of tenantIds) {
      await this.members.cancelDeparture(tenantId, ref.userId);
    }
  }

  /** {@inheritDoc AccessFacade.cancelDepartures} */
  override async cancelDepartures(ref: UserRef): Promise<void> {
    for (const { tenantId } of await this.resolver.tenantsOf(ref)) {
      await this.members.cancelDeparture(tenantId, ref.userId);
    }
  }

  /** {@inheritDoc AccessFacade.removeFromAllTenants} */
  override async removeFromAllTenants(ref: UserRef): Promise<void> {
    for (const { tenantId } of await this.resolver.tenantsOf(ref)) {
      await this.members.removeErased(tenantId, ref);
    }
    await this.tombstones.forget(ref.userId);
  }

  /** {@inheritDoc AccessFacade.discardTenant} */
  override discardTenant(tenantId: string): Promise<void> {
    return this.setup.discard(tenantId);
  }

  /** {@inheritDoc AccessFacade.replayPermissionVersion} */
  override replayPermissionVersion(
    event: PermissionsChangedPayload,
  ): Promise<void> {
    return this.versions.replay(event);
  }

  /** {@inheritDoc AccessFacade.refreshTenant} */
  override refreshTenant(tenantId: string): Promise<void> {
    return this.refresh.execute(tenantId);
  }
}
