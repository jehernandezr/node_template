import type { EntityManagerProvider } from './entity-manager-provider.js';
import type { OptimisticWriter } from './optimistic-writer.js';
import type { PersistenceContextProvider } from './context/persistence-context-provider.js';
import type { PersistenceFeature } from './persistence-feature.js';
import type { ShardScope } from './shard-scope.js';

/**
 * What a module repository needs besides its mapper. `PersistenceModule.forFeature`
 * builds it with the module's sharding declaration; the repository only injects this class.
 */
export class RepositoryKit {
  constructor(
    readonly feature: PersistenceFeature,
    readonly provider: EntityManagerProvider,
    readonly writer: OptimisticWriter,
    readonly context: PersistenceContextProvider,
    /** An active `ShardScope` takes precedence over the context tenant: it is the tenant that owns the queried data. */
    readonly scope: ShardScope,
  ) {}
}
