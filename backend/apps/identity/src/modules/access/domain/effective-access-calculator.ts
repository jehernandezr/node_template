import type { Permission } from '@contracts/identity';
import type { Group } from './group.js';
import type { Membership } from './membership.js';
import type { Role } from './role.js';

/** Effective permissions and roles of a member. */
export interface EffectiveAccess {
  readonly permissions: readonly Permission[];
  readonly roles: readonly string[];
}

/** Union of the permissions of the roles of the member's groups. */
export class EffectiveAccessCalculator {
  calculate(
    membership: Membership,
    groups: readonly Group[],
    roles: readonly Role[],
  ): EffectiveAccess {
    const memberRoles = this.rolesOfGroups(membership.groupIds, groups, roles);
    return {
      permissions: this.union(memberRoles),
      roles: memberRoles.map((role) => role.name).sort(),
    };
  }

  /** Permissions granted by belonging to those groups. */
  permissionsOfGroups(
    groupIds: readonly string[],
    groups: readonly Group[],
    roles: readonly Role[],
  ): readonly Permission[] {
    return this.union(this.rolesOfGroups(groupIds, groups, roles));
  }

  /** Permissions granted by a group with those roles. */
  permissionsOfRoles(
    roleIds: readonly string[],
    roles: readonly Role[],
  ): readonly Permission[] {
    return this.union(roles.filter((role) => roleIds.includes(role.id)));
  }

  private rolesOfGroups(
    groupIds: readonly string[],
    groups: readonly Group[],
    roles: readonly Role[],
  ): readonly Role[] {
    const roleIds = new Set(
      groups
        .filter((group) => groupIds.includes(group.id))
        .flatMap((group) => group.roleIds),
    );
    return roles.filter((role) => roleIds.has(role.id));
  }

  private union(roles: readonly Role[]): Permission[] {
    return [...new Set(roles.flatMap((role) => role.permissions))].sort();
  }
}
