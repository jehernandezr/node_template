import { Injectable } from '@nestjs/common';
import type { UserAccess } from '@contracts/identity';
import type { Actor } from '@platform/auth';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { UserTenant } from '../domain/user-tenant.js';
import { AccessFacade } from './access.facade.js';
import { RefreshTenantAccess } from './refresh-tenant-access.use-case.js';
import { AccessResolver } from './access-resolver.js';
import { GrantCeiling } from './grant-ceiling.js';
import { ManageMembers } from './manage-members.use-case.js';
import { TenantAccessSetup } from './tenant-access-setup.js';

/** `AccessFacade` dentro del proceso. */
@Injectable()
export class LocalAccessFacade extends AccessFacade {
  constructor(
    private readonly resolver: AccessResolver,
    private readonly setup: TenantAccessSetup,
    private readonly ceiling: GrantCeiling,
    private readonly refresh: RefreshTenantAccess,
    private readonly members: ManageMembers,
  ) {
    super();
  }

  resolve(userId: string, tenantId: string): Promise<UserAccess> {
    return this.resolver.resolve(userId, tenantId);
  }

  isMember(userId: string, tenantId: string): Promise<boolean> {
    return this.resolver.isMember(userId, tenantId);
  }

  defaultTenant(ref: UserRef): Promise<string> {
    return this.resolver.defaultTenant(ref);
  }

  requiresMfaOnEveryLogin(ref: UserRef, tenantId: string): Promise<boolean> {
    return this.resolver.requiresMfaOnEveryLogin(ref, tenantId);
  }

  addMember(
    tenantId: string,
    ref: UserRef,
    groupIds: readonly string[],
  ): Promise<void> {
    return this.setup.addMember(tenantId, ref, groupIds);
  }

  assertCanGrantGroups(
    tenantId: string,
    actor: Actor | undefined,
    groupIds: readonly string[],
  ): Promise<void> {
    return this.ceiling.assertActorCanGrantGroups(tenantId, actor, groupIds);
  }

  setupTenant(tenantId: string, owner?: UserRef): Promise<void> {
    return this.setup.setup(tenantId, owner);
  }

  projectMembership(tenantId: string, ref: UserRef): Promise<void> {
    return this.setup.project(tenantId, ref);
  }

  tenantsOf(ref: UserRef): Promise<readonly UserTenant[]> {
    return this.resolver.tenantsOf(ref);
  }

  async removeFromAllTenants(ref: UserRef): Promise<void> {
    for (const { tenantId } of await this.resolver.tenantsOf(ref)) {
      await this.members.removeErased(tenantId, ref);
    }
  }

  refreshTenant(tenantId: string): Promise<void> {
    return this.refresh.execute(tenantId);
  }
}
