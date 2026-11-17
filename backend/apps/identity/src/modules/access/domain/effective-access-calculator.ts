import type { Permission } from '@contracts/identity';
import type { Group } from './group.js';
import type { Membership } from './membership.js';
import type { Role } from './role.js';

/** Permisos y roles efectivos de un miembro. */
export interface EffectiveAccess {
  readonly permissions: readonly Permission[];
  readonly roles: readonly string[];
}

/** Unión de los permisos de los roles de los grupos del miembro. */
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

  /** Permisos que otorga pertenecer a esos grupos. */
  permissionsOfGroups(
    groupIds: readonly string[],
    groups: readonly Group[],
    roles: readonly Role[],
  ): readonly Permission[] {
    return this.union(this.rolesOfGroups(groupIds, groups, roles));
  }

  /** Permisos que otorga un grupo con esos roles. */
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
