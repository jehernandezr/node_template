import type { TransactionOptions } from '@platform/kernel';
import type { PersistenceFeature } from '../persistence-feature.js';

/**
 * Opciones de `TypeOrmTransactionManager.runInTransaction`: las del puerto más la declaración
 * de sharding del módulo que abre la transacción. Sin `feature` se usa la declaración por defecto del servicio.
 */
export interface ShardedTransactionOptions extends TransactionOptions {
  readonly feature?: PersistenceFeature;
  readonly source?: unknown;
}
