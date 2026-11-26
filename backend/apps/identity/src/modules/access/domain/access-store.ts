import type { PlatformRole } from '@contracts/identity';
import type { Group } from './group.js';
import type { Membership } from './membership.js';
import type { Role } from './role.js';
import type { UserTenant } from './user-tenant.js';

/** Memberships, groups, roles and permission version of a tenant, in the tenant shard. */
export abstract class TenantAccessRepository {
  /**
   * Reads the current membership of a user.
   * @param userId Member.
   * @returns The membership, or `undefined` if the user is not a member.
   */
  abstract findMembership(userId: string): Promise<Membership | undefined>;

  /**
   * Lists the current memberships of the tenant.
   * @returns The memberships, oldest first.
   */
  abstract listMemberships(): Promise<readonly Membership[]>;

  /**
   * Reads one page of the current memberships in ascending user id, without loading the rest.
   * @param after User id the page starts after, or `undefined` for the first page.
   * @param limit Most memberships to read.
   * @returns Up to `limit` memberships whose user id is greater than `after`.
   */
  abstract listMembershipsAfter(
    after: string | undefined,
    limit: number,
  ): Promise<readonly Membership[]>;

  /**
   * Inserts a membership, replacing the tombstone a previous removal of that user left.
   * @param membership New membership.
   */
  abstract insertMembership(membership: Membership): Promise<void>;

  /**
   * Updates a membership with optimistic locking.
   * @param membership Changed membership.
   */
  abstract updateMembership(membership: Membership): Promise<void>;

  /**
   * Removes a member and keeps a tombstone with the last permission version it published, so a later
   * membership of the same user starts above it.
   * @param userId Member to remove.
   * @param finalVersion Permission version published with the removal.
   */
  abstract removeMembership(
    userId: string,
    finalVersion: number,
  ): Promise<void>;

  /**
   * Reads the permission version a removed member left behind.
   * @param userId User removed earlier.
   * @returns That version, or `undefined` if the user was never removed from the tenant.
   */
  abstract removedVersion(userId: string): Promise<number | undefined>;

  /**
   * Deletes a member and its tombstone for good: its user is being erased.
   * @param userId Member to delete.
   */
  abstract purgeMembership(userId: string): Promise<void>;

  /** Deletes every membership, tombstone, group, role and permission version of the tenant. */
  abstract purgeTenant(): Promise<void>;

  /**
   * Lists every group of the tenant in scope, for the members screen and the grant checks.
   * @returns The groups, with their roles.
   */
  abstract listGroups(): Promise<readonly Group[]>;

  /**
   * Stores a new group of the tenant in scope.
   * @param group New group.
   */
  abstract insertGroup(group: Group): Promise<void>;

  /**
   * Updates a group with optimistic locking.
   * @param group Changed group.
   */
  abstract updateGroup(group: Group): Promise<void>;

  /**
   * Deletes a group.
   * @param groupId Group to delete.
   */
  abstract deleteGroup(groupId: string): Promise<void>;

  /**
   * Lists every role of the tenant in scope, with the permissions each grants.
   * @returns The roles.
   */
  abstract listRoles(): Promise<readonly Role[]>;

  /**
   * Stores a new role of the tenant in scope.
   * @param role New role.
   */
  abstract insertRole(role: Role): Promise<void>;

  /**
   * Updates a role with optimistic locking.
   * @param role Changed role.
   */
  abstract updateRole(role: Role): Promise<void>;

  /**
   * Deletes a role.
   * @param roleId Role to delete.
   */
  abstract deleteRole(roleId: string): Promise<void>;

  /**
   * Serializes the access changes of the tenant until the open transaction ends. It is taken before reading
   * the memberships: two concurrent changes that check an invariant over the whole tenant (the last owner)
   * would each see the state before the other and both would commit.
   */
  abstract lockForChanges(): Promise<void>;

  /**
   * Reads the permission version of the tenant: the first part of the `pv` claim.
   * @returns The tenant version.
   */
  abstract tenantVersion(): Promise<number>;

  /**
   * Increments the tenant version.
   * @returns The new version.
   */
  abstract bumpTenantVersion(): Promise<number>;
}

/** Access data that lives in the user shard. */
export abstract class UserAccessRepository {
  /**
   * Lists the tenants projected for a user.
   * @param userId User.
   * @returns The projected memberships.
   */
  abstract listTenants(userId: string): Promise<readonly UserTenant[]>;

  /**
   * Projects a membership into the user shard. It is idempotent.
   * @param tenant Projected membership.
   */
  abstract projectTenant(tenant: UserTenant): Promise<void>;

  /**
   * Removes the projection of a membership.
   * @param userId User.
   * @param tenantId Tenant the user no longer belongs to.
   */
  abstract removeTenant(userId: string, tenantId: string): Promise<void>;

  /**
   * Lists the platform roles of a user.
   * @param userId User.
   * @returns The platform roles.
   */
  abstract platformRoles(userId: string): Promise<readonly PlatformRole[]>;

  /**
   * Gives a user a platform role, which works across every tenant; granting it again changes nothing.
   * @param userId User.
   * @param role Granted role.
   */
  abstract grantPlatformRole(userId: string, role: PlatformRole): Promise<void>;
}
