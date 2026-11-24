import { TenantMoveManifest } from './tenant-move-manifest.js';
import type { TenantMoveTable } from './tenant-move-table.js';

/** Varios manifiestos copiados como uno, en el orden dado: el del servicio y el de la plataforma. */
export class MergedTenantMoveManifest extends TenantMoveManifest {
  constructor(private readonly manifests: readonly TenantMoveManifest[]) {
    super();
  }

  tables(): readonly TenantMoveTable[] {
    return this.manifests.flatMap((manifest) => manifest.tables());
  }
}
