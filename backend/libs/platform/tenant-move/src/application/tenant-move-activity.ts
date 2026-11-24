import type { DataSource } from 'typeorm';

/** Trabajo del tenant en un shard que todavía puede escribir ahí y que el traslado no puede llevarse a medias. */
export abstract class TenantMoveActivity {
  /** Cuántos trabajos del tenant siguen abiertos en el shard. */
  abstract openWork(shard: DataSource, tenantId: string): Promise<number>;
}
