import { Injectable } from '@nestjs/common';
import type { PlatformRole } from '@contracts/identity';
import { RepositoryKit } from '@platform/persistence';
import { UserShardRepository } from '../../../../database/user-shard-repository.js';
import { UserAccessRepository } from '../../domain/access-store.js';
import type { UserTenant } from '../../domain/user-tenant.js';
import { PlatformRoleAssignmentEntity } from './entities/platform-role-assignment.entity.js';
import { UserTenantEntity } from './entities/user-tenant.entity.js';

/** `UserAccessRepository` sobre `user_tenants` y `platform_role_assignments` del shard del usuario. */
@Injectable()
export class TypeOrmUserAccessRepository
  extends UserShardRepository
  implements UserAccessRepository
{
  constructor(kit: RepositoryKit) {
    super(kit);
  }

  async listTenants(userId: string): Promise<readonly UserTenant[]> {
    const rows = await this.read((manager) =>
      manager.find(UserTenantEntity, {
        where: { userId },
        order: { joinedAt: 'ASC' },
      }),
    );
    return rows.map((row) => ({
      userId: row.userId,
      tenantId: row.tenantId,
      joinedAt: row.joinedAt,
    }));
  }

  async projectTenant(tenant: UserTenant): Promise<void> {
    await this.write((manager) =>
      manager
        .createQueryBuilder()
        .insert()
        .into(UserTenantEntity)
        .values({ ...tenant })
        .orIgnore()
        .execute(),
    );
  }

  async removeTenant(userId: string, tenantId: string): Promise<void> {
    await this.write((manager) =>
      manager.delete(UserTenantEntity, { userId, tenantId }),
    );
  }

  async platformRoles(userId: string): Promise<readonly PlatformRole[]> {
    const rows = await this.read((manager) =>
      manager.findBy(PlatformRoleAssignmentEntity, { userId }),
    );
    return rows.map((row) => row.role as PlatformRole).sort();
  }

  async grantPlatformRole(userId: string, role: PlatformRole): Promise<void> {
    await this.write((manager) =>
      manager
        .createQueryBuilder()
        .insert()
        .into(PlatformRoleAssignmentEntity)
        .values({ userId, role })
        .orIgnore()
        .execute(),
    );
  }
}
