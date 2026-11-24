import { ConfigSection, envNumber } from '@platform/config';
import { z } from 'zod';
import { TenantWriteGateKind } from './tenant-write-gate-kind.enum.js';

export const tenantWritesConfigSchema = z.object({
  /** Dónde se cierra la compuerta de escritura de un tenant mientras se traslada. */
  TENANT_WRITE_GATE: z
    .enum(TenantWriteGateKind)
    .default(TenantWriteGateKind.Directory),
  /**
   * Cuánto espera una escritura con la compuerta del tenant cerrada antes de responder
   * `PLATFORM.SHARDING.TENANT_MIGRATING` con `Retry-After`.
   */
  TENANT_MOVE_MAX_WAIT_MS: envNumber({ min: 0, max: 60_000 }).default(5_000),
});

export type TenantWritesSettings = z.output<typeof tenantWritesConfigSchema>;

export const TenantWritesConfig = new ConfigSection<TenantWritesSettings>(
  'tenant-writes',
  tenantWritesConfigSchema,
);
