import type { DataSource } from 'typeorm';

/** Un traslado en curso dentro de un servicio: el tenant, su shard de origen y el de destino. */
export interface TenantTransfer {
  readonly moveId: string;
  readonly tenantId: string;
  readonly source: DataSource;
  readonly target: DataSource;
}
