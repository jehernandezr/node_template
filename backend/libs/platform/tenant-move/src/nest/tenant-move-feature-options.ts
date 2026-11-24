import type { Type } from '@nestjs/common';
import type { TenantMoveOperations } from '@contracts/platform';
import type { TenantMoveListener } from '../application/tenant-move-listener.js';
import type { TenantMoveManifest } from '../manifest/tenant-move-manifest.js';

/** Lo que cada servicio pasa a `TenantMoveModule.forFeature`. */
export interface TenantMoveFeatureOptions {
  /** Las operaciones de traslado de su contrato, las de `defineTenantMoveOperations`. */
  readonly operations: TenantMoveOperations;
  /** Se instancia en el módulo: no recibe dependencias. */
  readonly manifest: Type<TenantMoveManifest>;
  /**
   * Lo que el servicio hace además al cambiar de directorio o al cancelar. Se instancia en el módulo con lo que
   * exportan los módulos globales del servicio.
   */
  readonly listener?: Type<TenantMoveListener>;
}
