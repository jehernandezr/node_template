/** System role of a tenant. Its permissions are fixed. */
export enum TenantRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
  Billing = 'billing',
}

/** Tenant type. */
export enum TenantKind {
  Organization = 'organization',
  SharedCustomers = 'shared_customers',
  Platform = 'platform',
}

/**
 * Lifecycle of a tenant. It is not called `TenantStatus` to avoid clashing with the
 * one in `@platform/sharding`.
 */
export enum TenantLifecycle {
  Provisioning = 'provisioning',
  Active = 'active',
  Suspended = 'suspended',
  Deleting = 'deleting',
}

/** Status of an invitation to a tenant. */
export enum InvitationStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Revoked = 'revoked',
  Expired = 'expired',
}

/** What changed in a user's membership in a tenant. */
export enum MembershipChangeKind {
  Added = 'added',
  Removed = 'removed',
  GroupsChanged = 'groups_changed',
}
