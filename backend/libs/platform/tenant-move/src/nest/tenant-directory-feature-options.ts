import type { Type } from '@nestjs/common';
import type { TenantDirectoryOperations } from '@contracts/platform';
import type { TenantMoveManifest } from '../manifest/tenant-move-manifest.js';

/** What each service that follows the identity placement passes to `TenantDirectoryModule.forFeature`. */
export interface TenantDirectoryFeatureOptions {
  /** Service name: the prefix of its logical shards when a group is not declared. */
  readonly service: string;
  /** The operations of its contract, those from `defineTenantDirectoryOperations`. */
  readonly operations: TenantDirectoryOperations;
  /** The service move manifest: its tables are used to check whether a tenant already has data before removing it. */
  readonly manifest: Type<TenantMoveManifest>;
}
