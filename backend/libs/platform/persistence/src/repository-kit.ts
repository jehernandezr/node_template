import type { EntityManagerProvider } from './entity-manager-provider.js';
import type { OptimisticWriter } from './optimistic-writer.js';
import type { PersistenceContextProvider } from './context/persistence-context-provider.js';
import type { PersistenceFeature } from './persistence-feature.js';
import type { ShardScope } from './shard-scope.js';

/**
 * Lo que un repositorio de un módulo necesita además de su mapper. `PersistenceModule.forFeature`
 * lo arma con la declaración de sharding del módulo; el repositorio solo inyecta esta clase.
 */
export class RepositoryKit {
  constructor(
    readonly feature: PersistenceFeature,
    readonly provider: EntityManagerProvider,
    readonly writer: OptimisticWriter,
    readonly context: PersistenceContextProvider,
    /** Un `ShardScope` activo manda sobre el tenant del contexto: es el tenant dueño de los datos que se consultan. */
    readonly scope: ShardScope,
  ) {}
}
