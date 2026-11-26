import { Injectable } from '@nestjs/common';
import { TenantDirectory } from '../domain/tenant-directory.js';

/**
 * Points the catalog's slug index to the new region of a moved tenant. The tenant's row already arrives with
 * its new region at the target shard: the move changes it before opening writes, because from the source region
 * that shard is no longer reachable through routing. Repeating it changes nothing.
 */
@Injectable()
export class RelocateTenant {
  constructor(private readonly directory: TenantDirectory) {}

  /**
   * Points the catalog indexes of a moved tenant to its new region.
   * @param tenantId Moved tenant.
   * @param region New region.
   */
  async execute(tenantId: string, region: string): Promise<void> {
    await this.directory.relocate(tenantId, region);
  }
}
