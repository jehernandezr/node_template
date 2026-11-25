import { Injectable } from '@nestjs/common';
import type { Permission } from '@contracts/identity';
import type { Actor } from '@platform/auth';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import { TenantAccessRepository } from '../domain/access-store.js';
import { EffectiveAccessCalculator } from '../domain/effective-access-calculator.js';
import type { Group } from '../domain/group.js';
import type { Role } from '../domain/role.js';
import { ActorPermissions } from './actor-permissions.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';

/**
 * Nobody grants or removes a permission they lack: not with a role, nor by putting a role in a group, nor
 * by putting someone in a group or inviting them to one. Removing counts too, because demoting someone
 * with more permissions is another way of taking over the tenant.
 */
@Injectable()
export class GrantCeiling {
  private readonly calculator = new EffectiveAccessCalculator();

  constructor(
    private readonly actorPermissions: ActorPermissions,
    private readonly tenantAccess: TenantAccessRepository,
    private readonly scopes: IdentityShardScopes,
  ) {}

  /**
   * Checks that every requested permission is granted.
   * @param requested Permissions to grant or remove.
   * @param granted Permissions of the editor.
   * @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` with the permissions the editor lacks.
   */
  assertPermissions(
    requested: readonly Permission[],
    granted: readonly Permission[],
  ): void {
    const missing = requested.filter(
      (permission) => !granted.includes(permission),
    );
    if (missing.length > 0) {
      throw IdentityError.forbidden([...new Set(missing)]);
    }
  }

  /**
   * Checks that the groups exist and their permissions are within the editor's.
   * @param groupIds Groups to grant or remove.
   * @param groups Groups of the tenant.
   * @param roles Roles of the tenant.
   * @param granted Permissions of the editor.
   * @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` or `PLATFORM.RESOURCE.NOT_FOUND`.
   */
  assertGroups(
    groupIds: readonly string[],
    groups: readonly Group[],
    roles: readonly Role[],
    granted: readonly Permission[],
  ): void {
    if (groupIds.some((id) => !groups.some((group) => group.id === id))) {
      throw IdentityError.notFound();
    }
    this.assertPermissions(
      this.calculator.permissionsOfGroups(groupIds, groups, roles),
      granted,
    );
  }

  /**
   * Checks that the roles exist and their permissions are within the editor's.
   * @param roleIds Roles to grant or remove.
   * @param roles Roles of the tenant.
   * @param granted Permissions of the editor.
   * @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` or `PLATFORM.RESOURCE.NOT_FOUND`.
   */
  assertRoles(
    roleIds: readonly string[],
    roles: readonly Role[],
    granted: readonly Permission[],
  ): void {
    if (roleIds.some((id) => !roles.some((role) => role.id === id))) {
      throw IdentityError.notFound();
    }
    this.assertPermissions(
      this.calculator.permissionsOfRoles(roleIds, roles),
      granted,
    );
  }

  /**
   * Checks for an inviter that the groups of the invitation grant nothing the actor lacks.
   * @param tenantId Tenant.
   * @param actor Inviter.
   * @param groupIds Groups of the invitation.
   * @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` or `PLATFORM.RESOURCE.NOT_FOUND`.
   */
  async assertActorCanGrantGroups(
    tenantId: string,
    actor: Actor | undefined,
    groupIds: readonly string[],
  ): Promise<void> {
    await this.assertGroupsWithin(
      tenantId,
      groupIds,
      await this.actorPermissions.of(actor),
    );
  }

  /**
   * Checks that the groups exist in the tenant and grant nothing beyond the given permissions.
   * @param tenantId Tenant.
   * @param groupIds Groups to grant.
   * @param granted Permissions of whoever grants them.
   * @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` or `PLATFORM.RESOURCE.NOT_FOUND`.
   */
  async assertGroupsWithin(
    tenantId: string,
    groupIds: readonly string[],
    granted: readonly Permission[],
  ): Promise<void> {
    await this.scopes.inTenantShard(tenantId, async () => {
      this.assertGroups(
        groupIds,
        await this.tenantAccess.listGroups(),
        await this.tenantAccess.listRoles(),
        granted,
      );
    });
  }
}
