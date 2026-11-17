import type { ManagerIntent } from '@platform/persistence';
import type { EntityManager } from 'typeorm';

/**
 * Dónde corre una tabla de claims: `PlatformEntityManagers` la lleva al shard del tenant y
 * `CatalogClaimManagers` al catálogo global.
 */
export interface ClaimRecordManagers {
  run<T>(
    intent: ManagerIntent,
    fn: (manager: EntityManager) => Promise<T>,
  ): Promise<T>;
  /** Mantenimiento que no pertenece a un tenant: devuelve la suma de lo que devuelve `fn`. */
  sweep(fn: (manager: EntityManager) => Promise<number>): Promise<number>;
}
