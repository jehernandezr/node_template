import type { TenantRole } from '@contracts/identity';

/** A tenant group with its roles. System groups represent a fixed role and are not edited. */
export interface Group {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly systemRole: TenantRole | null;
  readonly roleIds: readonly string[];
  readonly version?: number;
}
