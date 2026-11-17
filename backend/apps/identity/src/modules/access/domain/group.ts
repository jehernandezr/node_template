import type { TenantRole } from '@contracts/identity';

/** Un grupo del tenant con sus roles. Los de sistema representan un rol fijo y no se editan. */
export interface Group {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly systemRole: TenantRole | null;
  readonly roleIds: readonly string[];
  readonly version?: number;
}
