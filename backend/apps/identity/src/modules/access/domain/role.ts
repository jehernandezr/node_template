import type { Permission, TenantRole } from '@contracts/identity';

/** Un rol del tenant. Uno de sistema tiene los permisos fijos de `SystemRolePermissions`. */
export interface Role {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly systemRole: TenantRole | null;
  readonly permissions: readonly Permission[];
  readonly version?: number;
}
