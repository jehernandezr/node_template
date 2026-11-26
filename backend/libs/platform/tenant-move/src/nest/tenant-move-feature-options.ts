import type { ModuleMetadata, Type } from '@nestjs/common';
import type { TenantMoveOperations } from '@contracts/platform';
import type { TenantMoveListener } from '../application/tenant-move-listener.js';
import type { TenantMoveManifest } from '../manifest/tenant-move-manifest.js';

/** What each service passes to `TenantMoveModule.forFeature`. */
export interface TenantMoveFeatureOptions {
  /** The move operations of its contract, those from `defineTenantMoveOperations`. */
  readonly operations: TenantMoveOperations;
  /** Instantiated in the module: it receives no dependencies. */
  readonly manifest: Type<TenantMoveManifest>;
  /**
   * What the service also does when switching directory or canceling. Instantiated in the module with what
   * `imports` and the global modules export.
   */
  readonly listener?: Type<TenantMoveListener>;
  /** The service modules whose exports the listener injects. */
  readonly imports?: ModuleMetadata['imports'];
}
