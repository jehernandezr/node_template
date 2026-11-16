/** Rol de sistema de un tenant. Sus permisos son fijos. */
export enum TenantRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member',
  Billing = 'billing',
}

/** Tipo de tenant. */
export enum TenantKind {
  Organization = 'organization',
  SharedCustomers = 'shared_customers',
  Platform = 'platform',
}

/**
 * Ciclo de vida de un tenant. No se llama `TenantStatus` para no chocar con el
 * de `@platform/sharding`.
 */
export enum TenantLifecycle {
  Provisioning = 'provisioning',
  Active = 'active',
  Suspended = 'suspended',
  Deleting = 'deleting',
}

/** Estado de una invitación a un tenant. */
export enum InvitationStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Revoked = 'revoked',
  Expired = 'expired',
}

/** Qué cambió en la membresía de un usuario en un tenant. */
export enum MembershipChangeKind {
  Added = 'added',
  Removed = 'removed',
  GroupsChanged = 'groups_changed',
}
