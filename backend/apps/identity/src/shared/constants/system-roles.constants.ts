import { Permission, TenantRole } from '@contracts/identity';

const ALL_TENANT_PERMISSIONS: readonly Permission[] = Object.values(
  Permission,
).filter((permission) => permission !== Permission.BackofficeAccess);

/**
 * Permisos fijos de los roles de sistema de un tenant. Un rol de sistema no se edita ni se borra
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
 * Permisos que hacen administrador a quien los tiene, venga de un grupo de sistema o de uno propio del
 * tenant: con cualquiera de ellos el inicio de sesión pide segundo factor siempre.
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
