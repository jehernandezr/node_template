import { Module, type Type, type DynamicModule } from '@nestjs/common';
import { SagaError } from '../errors/saga-error.js';
import { SagaErrorCode } from '../errors/saga-error-code.enum.js';
import type { SagaDefinition } from '../definition/saga-definition.js';
import { SagaRegistry } from '../definition/saga-registry.js';
import { SagaEngine } from '../engine/saga-engine.js';
import { Sagas } from '../engine/sagas.js';
import { SagaStore } from '../store/saga-store.js';
import { SagaRecoveryJob } from '../jobs/saga-recovery-job.js';
import { SagaRetentionJob } from '../jobs/saga-retention-job.js';
import type { SagaModuleExtras } from './saga-module-extras.js';
import type { SagaModuleOptions } from './saga-module-options.js';
import {
  SagaModuleClass,
  type SagaModuleAsyncOptions,
} from './saga.module-definition.js';
import { SagaProviders } from './saga.providers.js';

/**
 * Saga wiring. Provides `Sagas` (what a use case injects), `SagaStore` (to query the state
 * of an instance),
 * `SagaEngine`, `SagaRegistry`, and the recovery and retention jobs, which
 * `SchedulingModule` discovers without this module importing it. It is global so
 * that use cases inject `Sagas` without importing it.
 *
 * The normal case is to start the saga after the use case commit. If it is
 * started inside an open transaction, the instance is created with it and
 * the steps run after the commit: if the transaction is rolled back, the saga does not
 * exist, and if the run fails after the commit, `SagaRecoveryJob` resumes it.
 *
 * ```ts
 * @Module({
 *   imports: [
 *     SagaPostgresModule,
 *     SagaModule.forRoot({ store: TypeOrmSagaStore, scopes: ShardedSagaScopes }),
 *     SagaModule.forFeature([CreateTenantSaga]),
 *   ],
 * })
 * export class OnboardingModule {}
 *
 * class CreateTenant {
 *   constructor(private readonly sagas: Sagas) {}
 *
 *   async execute(state: TenantState, key: string): Promise<void> {
 *     await this.sagas.start(CreateTenantSaga, state, { idempotencyKey: key });
 *   }
 * }
 * ```
 *
 * `forRoot` and `forRootAsync` require `store`. With `forFeature`, an invalid
 * definition brings down the startup, because the registry is sealed in `onApplicationBootstrap`.
 */
@Module({})
export class SagaModule extends SagaModuleClass {
  static override forRoot(
    options: SagaModuleOptions & SagaModuleExtras,
  ): DynamicModule {
    return SagaModule.complete(super.forRoot(options), options);
  }

  static override forRootAsync(
    options: SagaModuleAsyncOptions & SagaModuleExtras,
  ): DynamicModule {
    return SagaModule.complete(super.forRootAsync(options), options);
  }

  /**
   * Registers the definitions of a module. Each call uses its own symbol,
   * so two `forFeature` calls do not collide. Requires `forRoot` in the application.
   */
  static forFeature(
    definitions: readonly Type<SagaDefinition<unknown>>[],
  ): DynamicModule {
    return {
      module: SagaModule,
      providers: [
        ...definitions,
        {
          provide: Symbol('SagaFeature'),
          useFactory: (
            registry: SagaRegistry,
            ...instances: SagaDefinition<unknown>[]
          ): boolean => {
            registry.add(...instances);
            return true;
          },
          inject: [SagaRegistry, ...definitions],
        },
      ],
    };
  }

  /** @throws SagaError `InvalidConfiguration` when the store is missing. */
  private static complete(
    base: DynamicModule,
    extras: SagaModuleExtras,
  ): DynamicModule {
    if (extras.store === undefined) {
      throw new SagaError(
        SagaErrorCode.InvalidConfiguration,
        'SagaModule needs a store, for example TypeOrmSagaStore',
        { details: { option: 'store' } },
      );
    }
    return {
      ...base,
      global: true,
      imports: [...(base.imports ?? [])],
      providers: [...(base.providers ?? []), ...SagaProviders.build(extras)],
      exports: [
        Sagas,
        SagaStore,
        SagaEngine,
        SagaRegistry,
        SagaRecoveryJob,
        SagaRetentionJob,
      ],
    };
  }
}
