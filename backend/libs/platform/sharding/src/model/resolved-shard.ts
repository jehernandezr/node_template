import type { TenantStatus } from './tenant-status.enum.js';

/** Resultado de enrutar una petición a una instancia física. */
export interface ResolvedShard {
  readonly tenantId: string;
  readonly region: string;
  readonly logicalShard: string;
  /** Instancia física que aloja el shard lógico. */
  readonly instance: string;
  readonly status: TenantStatus;
}
