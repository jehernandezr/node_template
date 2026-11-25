import type { UserAccess } from '@contracts/identity';
import type { Actor } from '@platform/auth';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { UserTenant } from '../domain/user-tenant.js';

/** What `access` offers to the other modules. */
export abstract class AccessFacade {
  /**
   * Resolves the effective access of a user in a tenant.
   * @param userId User.
   * @param tenantId Tenant.
   * @returns The access, with the permission version.
   */
  abstract resolve(userId: string, tenantId: string): Promise<UserAccess>;

  /**
   * Tells whether a user is a member of a tenant.
   * @param userId User.
   * @param tenantId Tenant.
   * @returns Whether the membership exists.
   */
  abstract isMember(userId: string, tenantId: string): Promise<boolean>;

  /**
   * Picks the tenant in which a user without a previous session signs in.
   * @param ref User.
   * @returns The tenant id.
   */
  abstract defaultTenant(ref: UserRef): Promise<string>;

  /**
   * Tells whether the user administers that tenant and so needs a second factor on every sign-in.
   * @param ref User.
   * @param tenantId Tenant of the sign-in.
   * @returns Whether MFA is required on every sign-in.
   */
  abstract requiresMfaOnEveryLogin(
    ref: UserRef,
    tenantId: string,
  ): Promise<boolean>;

  /**
   * Adds a member to a tenant.
   * @param tenantId Tenant.
   * @param ref New member.
   * @param groupIds Groups of the member; the members group if empty.
   */
  abstract addMember(
    tenantId: string,
    ref: UserRef,
    groupIds: readonly string[],
  ): Promise<void>;

  /**
   * Checks that the groups exist in the tenant and grant nothing the actor lacks.
   * @param tenantId Tenant.
   * @param actor Who grants the groups.
   * @param groupIds Groups to grant.
   * @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` or `PLATFORM.RESOURCE.NOT_FOUND`.
   */
  abstract assertCanGrantGroups(
    tenantId: string,
    actor: Actor | undefined,
    groupIds: readonly string[],
  ): Promise<void>;

  /**
   * Creates the system roles and groups of a new tenant and, if given, the membership of its owner.
   * @param tenantId New tenant.
   * @param owner Owner, if any.
   */
  abstract setupTenant(tenantId: string, owner?: UserRef): Promise<void>;

  /**
   * Copies the membership of the user to the user shard; it is idempotent.
   * @param tenantId Tenant.
   * @param ref Member.
   */
  abstract projectMembership(tenantId: string, ref: UserRef): Promise<void>;

  /**
   * Lists the tenants of the user from its `user_tenants` projection.
   * @param ref User.
   * @returns The projected memberships.
   */
  abstract tenantsOf(ref: UserRef): Promise<readonly UserTenant[]>;

  /**
   * Removes the user from every tenant for the deletion of their account. It is idempotent.
   * @param ref Erased user.
   */
  abstract removeFromAllTenants(ref: UserRef): Promise<void>;

  /**
   * Deletes all the access of a discarded tenant, the projections of its members included. It is idempotent.
   * @param tenantId Discarded tenant.
   */
  abstract discardTenant(tenantId: string): Promise<void>;

  /**
   * Raises the permission version of the tenant: the access of every member is computed again.
   * @param tenantId Tenant.
   */
  abstract refreshTenant(tenantId: string): Promise<void>;
}
