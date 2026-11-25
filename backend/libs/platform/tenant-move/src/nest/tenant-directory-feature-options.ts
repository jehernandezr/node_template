import type { Type } from '@nestjs/common';
import type { TenantDirectoryOperations } from '@contracts/platform';
import type { TenantMoveManifest } from '../manifest/tenant-move-manifest.js';

/** Lo que cada servicio que sigue la ubicación de identity pasa a `TenantDirectoryModule.forFeature`. */
export interface TenantDirectoryFeatureOptions {
  /** Nombre del servicio: el prefijo de sus shards lógicos cuando un grupo no está declarado. */
  readonly service: string;
  /** Las operaciones de su contrato, las de `defineTenantDirectoryOperations`. */
  readonly operations: TenantDirectoryOperations;
  /** El manifiesto de traslado del servicio: con sus tablas se mira si un tenant ya tiene datos antes de retirarlo. */
  readonly manifest: Type<TenantMoveManifest>;
}
