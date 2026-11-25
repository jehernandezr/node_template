import { Injectable } from '@nestjs/common';
import {
  FeatureFlag,
  IdentityErrorCode,
  type Permission,
  type UserAccess,
} from '@contracts/identity';
import { FlagEvaluator, type FlagContext } from '@platform/flags';
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

/** Computes the effective access and answers the membership questions of the other modules. */
@Injectable()
export class AccessResolver {
  private readonly calculator = new EffectiveAccessCalculator();

  constructor(
    private readonly tenantAccess: TenantAccessRepository,
    private readonly userAccess: UserAccessRepository,
    private readonly tenants: TenantsFacade,
    private readonly entitlements: EntitlementsProvider,
    private readonly scopes: IdentityShardScopes,
    private readonly flags: FlagEvaluator,
  ) {}

  /**
   * Resolves the effective access of a member.
   * @param userId User.
   * @param tenantId Tenant.
   * @returns The access with its permission version, platform roles, features and flags.
   * @throws IdentityError `IDENTITY.TENANT.NOT_MEMBER` if the user is not a member of the tenant.
   */
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
      features: [...this.entitlements.features(tenant)],
      flags: await this.flagsFor({
        tenantId,
        userId,
        plan: tenant.kind,
        groups: access.roles,
      }),
    };
  }

  /** Only the flags the contract knows: a rule of another service does not travel in the token. */
  private async flagsFor(context: FlagContext): Promise<FeatureFlag[]> {
    const enabled = await this.flags.enabledFlags(context);
    return Object.values(FeatureFlag).filter((flag) => enabled.includes(flag));
  }

  /**
   * Tells whether a user is a member of a tenant.
   * @param userId User.
   * @param tenantId Tenant.
   * @returns Whether the membership exists.
   */
  async isMember(userId: string, tenantId: string): Promise<boolean> {
    const membership = await this.scopes.inTenantShard(tenantId, () =>
      this.tenantAccess.findMembership(userId),
    );
    return membership !== undefined;
  }

  /**
   * Picks the home tenant if the user is still a member of it, otherwise the first one they joined.
   * @param ref User.
   * @returns The tenant id.
   * @throws IdentityError `IDENTITY.TENANT.NOT_MEMBER` if the user belongs to no tenant.
   */
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
   * Tells whether the user always needs a second factor: whoever administers the tenant (with any
   * administrative permission, from a system or custom group) and whoever has platform roles.
   * @param ref User.
   * @param tenantId Tenant of the sign-in.
   * @returns Whether MFA is required on every sign-in.
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

  /**
   * Reads the permissions of a membership without the rest of the access.
   * @param tenantId Tenant.
   * @param userId User.
   * @returns Its permissions, or none if the user is not a member.
   */
  memberPermissions(
    tenantId: string,
    userId: string,
  ): Promise<readonly Permission[]> {
    return this.scopes.inTenantShard(tenantId, async () => {
      const membership = await this.tenantAccess.findMembership(userId);
      return membership === undefined
        ? []
        : this.calculator.calculate(
            membership,
            await this.tenantAccess.listGroups(),
            await this.tenantAccess.listRoles(),
          ).permissions;
    });
  }

  /**
   * Lists the tenants of a user from their projection.
   * @param ref User.
   * @returns The projected memberships.
   */
  tenantsOf(ref: UserRef): Promise<readonly UserTenant[]> {
    return this.scopes.inUserShard(ref, () =>
      this.userAccess.listTenants(ref.userId),
    );
  }
}
