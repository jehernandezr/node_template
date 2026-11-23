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
 * Cableado de sagas. Provee `Sagas` (lo que inyecta un caso de uso), `SagaStore` (para consultar el estado
 * de una instancia),
 * `SagaEngine`, `SagaRegistry`, los jobs de recuperación y de retención, que
 * `SchedulingModule` descubre sin que este módulo lo importe. Es global para
 * que los casos de uso inyecten `Sagas` sin importarlo.
 *
 * Lo normal es arrancar la saga después del commit del caso de uso. Si se
 * arranca dentro de una transacción abierta, la instancia se crea con ella y
 * los pasos corren tras el commit: si la transacción se deshace, la saga no
 * existe, y si la corrida falla después del commit la retoma `SagaRecoveryJob`.
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
 * `forRoot` y `forRootAsync` exigen `store`. Con `forFeature`, la definición
 * inválida tumba el arranque, porque el registro se sella en `onApplicationBootstrap`.
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
   * Registra las definiciones de un módulo. Cada llamada usa su propio símbolo,
   * así dos `forFeature` no chocan. Requiere `forRoot` en la aplicación.
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

  /** @throws SagaError `InvalidConfiguration` cuando falta el almacén. */
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
