import { Permission, TenantRole } from '@contracts/identity';

const ALL_TENANT_PERMISSIONS: readonly Permission[] = Object.values(
  Permission,
).filter((permission) => permission !== Permission.BackofficeAccess);

/**
 * Fixed permissions of a tenant's system roles. A system role cannot be edited or deleted
 * (`IDENTITY.ACCESS.SYSTEM_ROLE_IMMUTABLE`).
 */
export const SystemRolePermissions: Readonly<
  Record<TenantRole, readonly Permission[]>
> = {
  [TenantRole.Owner]: ALL_TENANT_PERMISSIONS,
  [TenantRole.Admin]: ALL_TENANT_PERMISSIONS.filter(
    (permission) => permission !== Permission.IdentityTenantManage,
  ),
  [TenantRole.Member]: [
    Permission.TasksRead,
    Permission.TasksWrite,
    Permission.IdentityMembersRead,
  ],
  [TenantRole.Billing]: [
    Permission.BillingRead,
    Permission.BillingWrite,
    Permission.IdentityMembersRead,
  ],
};

/**
 * Permissions that make whoever has them an administrator, whether from a system group or one of the
 * tenant's own: with any of them sign-in always requires a second factor.
 */
export const AdministrativePermissions: readonly Permission[] = [
  Permission.IdentityTenantManage,
  Permission.IdentityMembersManage,
  Permission.IdentityGroupsManage,
  Permission.IdentityRolesManage,
  Permission.IdentityInvitationsManage,
  Permission.IdentityServiceAccountsManage,
  Permission.IdentityApiKeysManage,
];
