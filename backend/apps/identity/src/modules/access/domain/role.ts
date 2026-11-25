import type { Permission, TenantRole } from '@contracts/identity';

/** A tenant role. A system role has the fixed permissions of `SystemRolePermissions`. */
export interface Role {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly systemRole: TenantRole | null;
  readonly permissions: readonly Permission[];
  readonly version?: number;
}
