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
 * Nadie otorga ni quita un permiso que no tiene: ni con un rol, ni poniendo un rol en un grupo, ni
 * poniendo a alguien en un grupo o invitándolo a uno. Quitar también cuenta, porque bajar a quien tiene
 * más permisos que uno es otra forma de quedarse con el tenant.
 */
@Injectable()
export class GrantCeiling {
  private readonly calculator = new EffectiveAccessCalculator();

  constructor(
    private readonly actorPermissions: ActorPermissions,
    private readonly tenantAccess: TenantAccessRepository,
    private readonly scopes: IdentityShardScopes,
  ) {}

  /** @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` con los permisos que quien edita no tiene. */
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

  /** Los grupos deben existir y sus permisos estar dentro de los de quien edita. */
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

  /** Los roles deben existir y sus permisos estar dentro de los de quien edita. */
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

  /** Para quien invita: los grupos de la invitación no otorgan nada que el actor no tenga. */
  async assertActorCanGrantGroups(
    tenantId: string,
    actor: Actor | undefined,
    groupIds: readonly string[],
  ): Promise<void> {
    const granted = await this.actorPermissions.of(actor);
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
