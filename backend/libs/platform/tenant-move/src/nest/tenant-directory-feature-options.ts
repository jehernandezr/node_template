import type { TenantDirectoryOperations } from '@contracts/platform';

/** Lo que cada servicio que sigue la ubicación de identity pasa a `TenantDirectoryModule.forFeature`. */
export interface TenantDirectoryFeatureOptions {
  /** Nombre del servicio: el prefijo de sus shards lógicos cuando un grupo no está declarado. */
  readonly service: string;
  /** Las operaciones de su contrato, las de `defineTenantDirectoryOperations`. */
  readonly operations: TenantDirectoryOperations;
}
