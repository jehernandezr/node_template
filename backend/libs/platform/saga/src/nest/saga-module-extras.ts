import type { Abstract, Type } from '@nestjs/common';
import type { RandomSource } from '@platform/kernel';
import type { OperationInvoker } from '../invoker/operation-invoker.js';
import type { SagaScopes } from '../store/saga-scopes.js';
import type { SagaStore } from '../store/saga-store.js';

/**
 * Adaptadores de `SagaModule`. Se pasan como tipo, no como instancia, y se fijan
 * al componer el módulo: van igual en `forRoot` y en `forRootAsync`.
 */
export interface SagaModuleExtras {
  /**
   * Obligatorio: almacén de las instancias, por ejemplo `TypeOrmSagaStore`. Va
   * opcional en el tipo para que `SagaModule` lance un error claro si falta.
   */
  readonly store?: Type<SagaStore> | Abstract<SagaStore>;
  /**
   * Cómo se llama a las operaciones. Por defecto, `InternalClientInvoker` sobre
   * el `InternalClient` de `@platform/internal-api`, que debe proveer `InternalApiModule`.
   */
  readonly invoker?: Type<OperationInvoker> | Abstract<OperationInvoker>;
  /** Por defecto, `AmbientSagaScopes`: una sola base. Con shards, `ShardedSagaScopes`. */
  readonly scopes?: Type<SagaScopes> | Abstract<SagaScopes>;
  /** Fuente de aleatoriedad para los tokens de lease y la espera de los reintentos. Por defecto, `SystemRandomSource`. */
  readonly random?: Type<RandomSource> | Abstract<RandomSource>;
}
