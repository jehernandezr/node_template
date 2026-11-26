import type {
  Permission,
  PermissionsChangedPayload,
  UserAccess,
} from '@contracts/identity';
import type { Actor } from '@platform/auth';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { UserTenant } from '../domain/user-tenant.js';

/** Memberships, permissions and tenant access setup that the other identity modules read and change. */
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
   * Grants a user a membership in its groups, within the seats of the plan and keeping at least one owner.
   * @param tenantId Tenant.
   * @param ref New member.
   * @param groupIds Groups of the member; the members group if empty.
   * @param seatLimit Members the plan admits, counted under the tenant lock; no limit if absent.
   * @throws IdentityError `IDENTITY.INVITATION.INVALID` if a group does not exist in the tenant, or if every
   *   owner is leaving and the new member is not an owner.
   * @throws QuotaExceededError `BILLING.QUOTA.EXCEEDED` if the tenant already holds `seatLimit` members.
   */
  abstract addMember(
    tenantId: string,
    ref: UserRef,
    groupIds: readonly string[],
    seatLimit?: number,
  ): Promise<void>;

  /**
   * Reads the current permissions of a member, or none if the user is not a member.
   * @param tenantId Tenant.
   * @param userId User.
   * @returns The permissions of the membership.
   */
  abstract memberPermissions(
    tenantId: string,
    userId: string,
  ): Promise<readonly Permission[]>;

  /**
   * Checks that the groups exist in the tenant and grant nothing beyond those permissions.
   * @param tenantId Tenant.
   * @param groupIds Groups to grant.
   * @param granted Permissions of whoever grants them.
   * @throws IdentityError `PLATFORM.AUTH.FORBIDDEN` or `PLATFORM.RESOURCE.NOT_FOUND`.
   */
  abstract assertGroupsWithin(
    tenantId: string,
    groupIds: readonly string[],
    granted: readonly Permission[],
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
   * Reserves the departure of the user from every tenant before their account is deleted: each tenant checks
   * under its lock that another owner who is not leaving remains, and marks the user as leaving. If one tenant
   * refuses, the departures this call reserved are cancelled.
   * @param ref User.
   * @returns The tenants whose departure this call reserved; a tenant the user was already leaving is not
   *   among them.
   * @throws IdentityError `IDENTITY.ACCESS.LAST_OWNER` if they are the last owner of a tenant with other members.
   */
  abstract reserveDepartures(ref: UserRef): Promise<readonly string[]>;

  /**
   * Cancels the departures of the user from those tenants only, the ones a deletion that did not start
   * reserved, so the departures of an earlier deletion still in flight stay. It is idempotent.
   * @param ref User.
   * @param tenantIds Tenants whose departure is cancelled.
   */
  abstract releaseDepartures(
    ref: UserRef,
    tenantIds: readonly string[],
  ): Promise<void>;

  /**
   * Cancels every departure reserved for the user: their account is active again. It is idempotent.
   * @param ref User.
   */
  abstract cancelDepartures(ref: UserRef): Promise<void>;

  /**
   * Removes the user from every tenant for the deletion of their account and deletes the tombstones of their
   * earlier removals. It is idempotent.
   * @param ref Erased user.
   * @throws IdentityError `IDENTITY.ACCESS.LAST_OWNER` if they are still the last owner of a tenant with other
   *   members.
   */
  abstract removeFromAllTenants(ref: UserRef): Promise<void>;

  /**
   * Deletes all the access of a discarded tenant, the projections of its members included. It is idempotent.
   * @param tenantId Discarded tenant.
   */
  abstract discardTenant(tenantId: string): Promise<void>;

  /**
   * Copies again into the shared auth state the version a published permission change carries.
   * @param event Published permission change.
   */
  abstract replayPermissionVersion(
    event: PermissionsChangedPayload,
  ): Promise<void>;

  /**
   * Raises the permission version of the tenant: the access of every member is computed again.
   * @param tenantId Tenant.
   */
  abstract refreshTenant(tenantId: string): Promise<void>;
}
