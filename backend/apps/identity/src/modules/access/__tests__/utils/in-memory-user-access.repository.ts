import type { PlatformRole } from '@contracts/identity';
import { UserAccessRepository } from '../../domain/access-store.js';
import type { UserTenant } from '../../domain/user-tenant.js';

/** In-memory `user_tenants` projection and platform roles. */
export class InMemoryUserAccessRepository extends UserAccessRepository {
  private readonly tenants = new Map<string, UserTenant>();
  private readonly roles = new Map<string, PlatformRole[]>();

  override async listTenants(userId: string): Promise<readonly UserTenant[]> {
    return [...this.tenants.values()].filter(
      (tenant) => tenant.userId === userId,
    );
  }

  override async projectTenant(tenant: UserTenant): Promise<void> {
    this.tenants.set(`${tenant.userId}@${tenant.tenantId}`, tenant);
  }

  override async removeTenant(userId: string, tenantId: string): Promise<void> {
    this.tenants.delete(`${userId}@${tenantId}`);
  }

  override async platformRoles(
    userId: string,
  ): Promise<readonly PlatformRole[]> {
    return this.roles.get(userId) ?? [];
  }

  override async grantPlatformRole(
    userId: string,
    role: PlatformRole,
  ): Promise<void> {
    this.roles.set(userId, [...(this.roles.get(userId) ?? []), role]);
  }
}
