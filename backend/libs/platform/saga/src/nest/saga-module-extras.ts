import type { Abstract, Type } from '@nestjs/common';
import type { RandomSource } from '@platform/kernel';
import type { OperationInvoker } from '../invoker/operation-invoker.js';
import type { SagaScopes } from '../store/saga-scopes.js';
import type { SagaStore } from '../store/saga-store.js';

/**
 * Adapters of `SagaModule`. They are passed as a type, not as an instance, and are fixed
 * when composing the module: they are the same in `forRoot` and in `forRootAsync`.
 */
export interface SagaModuleExtras {
  /**
   * Required: store of the instances, for example `TypeOrmSagaStore`. It is
   * optional in the type so that `SagaModule` throws a clear error if it is missing.
   */
  readonly store?: Type<SagaStore> | Abstract<SagaStore>;
  /**
   * How operations are called. By default, `InternalClientInvoker` on
   * the `InternalClient` of `@platform/internal-api`, which `InternalApiModule` must provide.
   */
  readonly invoker?: Type<OperationInvoker> | Abstract<OperationInvoker>;
  /** By default, `AmbientSagaScopes`: a single database. With shards, `ShardedSagaScopes`. */
  readonly scopes?: Type<SagaScopes> | Abstract<SagaScopes>;
  /** Source of randomness for the lease tokens and the retry wait. By default, `SystemRandomSource`. */
  readonly random?: Type<RandomSource> | Abstract<RandomSource>;
}
