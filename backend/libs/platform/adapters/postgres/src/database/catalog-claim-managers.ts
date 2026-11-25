import { ManagerIntent } from '@platform/persistence';
import type { EntityManager } from 'typeorm';
import type { ClaimRecordManagers } from '../model/claim-record-managers.js';
import type { CatalogEntityManagers } from './catalog-entity-managers.js';

/**
 * Moves a claims table to the global catalog. Used by services with `requireScope`: the shard of
 * an internal operation is decided by its handler, so the idempotency key cannot wait to know it.
 */
export class CatalogClaimManagers implements ClaimRecordManagers {
  constructor(private readonly catalog: CatalogEntityManagers) {}

  run<T>(
    intent: ManagerIntent,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    switch (intent) {
      case ManagerIntent.Write:
        return this.catalog.write(fn);
      case ManagerIntent.ReadPrimary:
        return this.catalog.readPrimary(fn);
      case ManagerIntent.Read:
        return this.catalog.read(fn);
    }
  }

  sweep(fn: (manager: EntityManager) => Promise<number>): Promise<number> {
    return this.catalog.write(fn);
  }
}
