import { TenantMoveManifest } from './tenant-move-manifest.js';
import type { TenantMoveTable } from './tenant-move-table.js';

/** Several manifests copied as one, in the given order: the service one and the platform one. */
export class MergedTenantMoveManifest extends TenantMoveManifest {
  constructor(private readonly manifests: readonly TenantMoveManifest[]) {
    super();
  }

  tables(): readonly TenantMoveTable[] {
    return this.manifests.flatMap((manifest) => manifest.tables());
  }
}
