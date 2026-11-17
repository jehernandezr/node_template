import { Injectable } from '@nestjs/common';
import { IdentityErrorCode, type UserAccess } from '@contracts/identity';
import { AdministrativePermissions } from '../../../shared/constants/system-roles.constants.js';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { IdentityShardScopes } from '../../../shared/utils/identity-shard-scopes.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { EntitlementsProvider, TenantsFacade } from '../../tenants/index.js';
import {
  TenantAccessRepository,
  UserAccessRepository,
} from '../domain/access-store.js';
import { EffectiveAccessCalculator } from '../domain/effective-access-calculator.js';
import type { UserTenant } from '../domain/user-tenant.js';

/** Calcula el acceso efectivo y responde las preguntas de membresía de los otros módulos. */
@Injectable()
export class AccessResolver {
  private readonly calculator = new EffectiveAccessCalculator();

  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly userAccess: UserAccessRepository,
    private readonly tenants: TenantsFacade,
    private readonly entitlements: EntitlementsProvider,
    private readonly scopes: IdentityShardScopes,
  ) {}

  /** @throws IdentityError `IDENTITY.TENANT.NOT_MEMBER` si el usuario no es miembro del tenant. */
  async resolve(userId: string, tenantId: string): Promise<UserAccess> {
    const access = await this.scopes.inTenantShard(tenantId, async () => {
      const membership = await this.tenantAccess.findMembership(userId);
      if (membership === undefined) {
        throw new IdentityError(IdentityErrorCode.TenantNotMember);
      }
      const effective = this.calculator.calculate(
        membership,
        await this.tenantAccess.listGroups(),
        await this.tenantAccess.listRoles(),
      );
      return {
        ...effective,
        homeTenantId: membership.homeTenantId,
        version: `${await this.tenantAccess.tenantVersion()}.${membership.permissionVersion}`,
      };
    });
    const tenant = await this.tenants.get(tenantId);
    const platformRoles = await this.scopes.inUserShard(
      { userId, homeTenantId: access.homeTenantId },
      () => this.userAccess.platformRoles(userId),
    );
    return {
      permissions: [...access.permissions],
      roles: [...access.roles],
      permissionVersion: access.version,
      platformRoles: [...platformRoles],
      features: [...this.entitlements.features(tenant.kind)],
      flags: [],
    };
  }

  async isMember(userId: string, tenantId: string): Promise<boolean> {
    const membership = await this.scopes.inTenantShard(tenantId, () =>
      this.tenantAccess.findMembership(userId),
    );
    return membership !== undefined;
  }

  /** El tenant de origen si sigue siendo miembro; si no, el primero al que se unió. */
  async defaultTenant(ref: UserRef): Promise<string> {
    const tenants = await this.tenantsOf(ref);
    const home = tenants.find((tenant) => tenant.tenantId === ref.homeTenantId);
    const chosen = home ?? tenants[0];
    if (chosen === undefined) {
      throw new IdentityError(IdentityErrorCode.TenantNotMember);
    }
    return chosen.tenantId;
  }

  /**
   * Quien administra el tenant (con cualquier permiso de administración, de un grupo de sistema o propio) y
   * quien tiene roles de plataforma piden segundo factor siempre.
   */
  async requiresMfaOnEveryLogin(
    ref: UserRef,
    tenantId: string,
  ): Promise<boolean> {
    const platformRoles = await this.scopes.inUserShard(ref, () =>
      this.userAccess.platformRoles(ref.userId),
    );
    if (platformRoles.length > 0) {
      return true;
    }
    return this.scopes.inTenantShard(tenantId, async () => {
      const membership = await this.tenantAccess.findMembership(ref.userId);
      if (membership === undefined) {
        return false;
      }
      const { permissions } = this.calculator.calculate(
        membership,
        await this.tenantAccess.listGroups(),
        await this.tenantAccess.listRoles(),
      );
      return permissions.some((permission) =>
        AdministrativePermissions.includes(permission),
      );
    });
  }

  tenantsOf(ref: UserRef): Promise<readonly UserTenant[]> {
    return this.scopes.inUserShard(ref, () =>
      this.userAccess.listTenants(ref.userId),
    );
  }
}
