import type { TransactionOptions } from '@platform/kernel';
import type { PersistenceFeature } from '../persistence-feature.js';

/**
 * Options of `TypeOrmTransactionManager.runInTransaction`: those of the port plus the sharding
 * declaration of the module that opens the transaction. Without `feature`, the service default declaration is used.
 */
export interface ShardedTransactionOptions extends TransactionOptions {
  readonly feature?: PersistenceFeature;
  readonly source?: unknown;
}
