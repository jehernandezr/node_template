import { ConfigSection, envNumber } from '@platform/config';
import { z } from 'zod';
import { TenantWriteGateKind } from './tenant-write-gate-kind.enum.js';

export const tenantWritesConfigSchema = z.object({
  /** Where a tenant's write gate is closed while it is being moved. */
  TENANT_WRITE_GATE: z
    .enum(TenantWriteGateKind)
    .default(TenantWriteGateKind.Directory),
  /**
   * How long a write waits with the tenant gate closed before responding
   * `PLATFORM.SHARDING.TENANT_MIGRATING` with `Retry-After`.
   */
  TENANT_MOVE_MAX_WAIT_MS: envNumber({ min: 0, max: 60_000 }).default(5_000),
});

export type TenantWritesSettings = z.output<typeof tenantWritesConfigSchema>;

export const TenantWritesConfig = new ConfigSection<TenantWritesSettings>(
  'tenant-writes',
  tenantWritesConfigSchema,
);
