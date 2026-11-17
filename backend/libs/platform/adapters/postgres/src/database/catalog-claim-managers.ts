import { ManagerIntent } from '@platform/persistence';
import type { EntityManager } from 'typeorm';
import type { ClaimRecordManagers } from '../model/claim-record-managers.js';
import type { CatalogEntityManagers } from './catalog-entity-managers.js';

/**
 * Lleva una tabla de claims al catálogo global. La usan los servicios con `requireScope`: el shard de
 * una operación interna lo decide su handler, así que la llave de idempotencia no puede esperar a saberlo.
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
