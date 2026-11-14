import type { TenantStatus } from './tenant-status.enum.js';

/** Dónde vive un tenant: su región y los shards lógicos que tiene asignados. */
export interface TenantPlacement {
  readonly tenantId: string;
  readonly region: string;
  /**
   * Lista no vacía de shards lógicos. Agregar un shard a un grupo solo es
   * válido con una saga de traslado y el tenant en `Migrating`, para que las
   * escrituras sigan bloqueadas mientras cambia el grupo.
   */
  readonly shardGroup: readonly string[];
  readonly status: TenantStatus;
  /** Aumenta con cada cambio del placement. Los cachés conservan la versión más alta. */
  readonly version: number;
  /** `true` cuando el tenant es dueño exclusivo de su shard. */
  readonly dedicated: boolean;
}
