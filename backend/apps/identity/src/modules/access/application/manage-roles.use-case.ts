import { Injectable } from '@nestjs/common';
import {
  IdentityErrorCode,
  type Permission,
  type RolePage,
  type RoleSummary,
  type UpdateRoleRequest,
} from '@contracts/identity';
import { IdGenerator, TransactionManager } from '@platform/kernel';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { TenantAccessRepository } from '../domain/access-store.js';
import type { Role } from '../domain/role.js';
import { AccessVersionPublisher } from './access-version-publisher.js';
import { GrantCeiling } from './grant-ceiling.js';

/**
 * Tenant roles. System roles are not edited or deleted, and a role cannot grant a permission that
 * its editor does not have.
 */
@Injectable()
export class ManageRoles {
  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly versions: AccessVersionPublisher,
    private readonly ceiling: GrantCeiling,
    private readonly scopes: IdentityShardScopes,
    private readonly transactions: TransactionManager,
    private readonly ids: IdGenerator,
  ) {}

  async list(tenantId: string): Promise<RolePage> {
    const roles = await this.scopes.inTenantShard(tenantId, () =>
      this.tenantAccess.listRoles(),
    );
    return { items: roles.map((role) => this.summary(role)), nextCursor: null };
  }

  async create(
    tenantId: string,
    name: string,
    permissions: readonly Permission[],
    granted: readonly Permission[],
  ): Promise<RoleSummary> {
    this.ceiling.assertPermissions(permissions, granted);
    return this.inTransaction(tenantId, async (roles) => {
      this.assertNameFree(roles, name);
      const role: Role = {
        id: this.ids.next().toString(),
        tenantId,
        name,
        systemRole: null,
        permissions: [...new Set(permissions)],
      };
      await this.tenantAccess.insertRole(role);
      return this.summary(role);
    });
  }

  async update(
    tenantId: string,
    request: UpdateRoleRequest,
    granted: readonly Permission[],
  ): Promise<RoleSummary> {
    if (request.permissions !== undefined) {
      this.ceiling.assertPermissions(request.permissions, granted);
    }
    return this.inTransaction(tenantId, async (roles) => {
      const role = this.editable(roles, request.roleId);
      if (request.permissions !== undefined) {
        this.ceiling.assertPermissions(role.permissions, granted);
      }
      if (request.name !== undefined && request.name !== role.name) {
        this.assertNameFree(roles, request.name);
      }
      const next: Role = {
        ...role,
        ...(request.name === undefined ? {} : { name: request.name }),
        ...(request.permissions === undefined
          ? {}
          : { permissions: [...new Set(request.permissions)] }),
      };
      await this.tenantAccess.updateRole(next);
      if (request.permissions !== undefined) {
        await this.versions.tenantChanged(
          tenantId,
          await this.tenantAccess.bumpTenantVersion(),
        );
      }
      return this.summary(next);
    });
  }

  async delete(
    tenantId: string,
    roleId: string,
    granted: readonly Permission[],
  ): Promise<void> {
    await this.inTransaction(tenantId, async (roles) => {
      this.ceiling.assertPermissions(
        this.editable(roles, roleId).permissions,
        granted,
      );
      for (const group of await this.tenantAccess.listGroups()) {
        if (group.roleIds.includes(roleId)) {
          await this.tenantAccess.updateGroup({
            ...group,
            roleIds: group.roleIds.filter((id) => id !== roleId),
          });
        }
      }
      await this.tenantAccess.deleteRole(roleId);
      await this.versions.tenantChanged(
        tenantId,
        await this.tenantAccess.bumpTenantVersion(),
      );
    });
  }

  private inTransaction<T>(
    tenantId: string,
    fn: (roles: readonly Role[]) => Promise<T>,
  ): Promise<T> {
    return this.scopes.inTenantShard(tenantId, () =>
      this.transactions.runInTransaction(async () => {
        await this.tenantAccess.lockForChanges();
        return fn(await this.tenantAccess.listRoles());
      }),
    );
  }

  private editable(roles: readonly Role[], roleId: string): Role {
    const role = roles.find((candidate) => candidate.id === roleId);
    if (role === undefined) {
      throw IdentityError.notFound();
    }
    if (role.systemRole !== null) {
      throw new IdentityError(IdentityErrorCode.AccessSystemRoleImmutable);
    }
    return role;
  }

  private assertNameFree(roles: readonly Role[], name: string): void {
    if (roles.some((role) => role.name === name)) {
      throw new IdentityError(IdentityErrorCode.AccessNameTaken);
    }
  }

  private summary(role: Role): RoleSummary {
    return {
      id: role.id,
      name: role.name,
      systemRole: role.systemRole,
      permissions: [...role.permissions],
    };
  }
}
