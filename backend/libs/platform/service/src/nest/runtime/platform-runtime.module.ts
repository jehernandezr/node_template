import {
  Module,
  type DynamicModule,
  type Provider,
  type Type,
} from '@nestjs/common';
import {
  ElastiCacheIamAuthTokenProvider,
  SnsSqsEnvelopePublisher,
} from '@platform/adapters-aws';
import { AwsModule } from '@platform/adapters-aws/nest';
import {
  DirectoryShardLister,
  ShardedRelayScopes,
  ShardedSagaScopes,
  TypeOrmDirectoryStore,
  TypeOrmIdempotencyStore,
  TypeOrmOutboxStore,
  TypeOrmProcessedMessageStore,
  TypeOrmSagaStore,
} from '@platform/adapters-postgres';
import {
  PostgresPlatformModule,
  SagaPostgresModule,
} from '@platform/adapters-postgres/nest';
import {
  ValkeyAuthMode,
  ValkeyBloomFilterFactory,
  ValkeyCache,
  ValkeyJobLock,
  ValkeyRateLimiter,
  ValkeyRoutingCache,
  ValkeyShardDirectoryChannel,
} from '@platform/adapters-valkey';
import { ValkeyModule } from '@platform/adapters-valkey/nest';
import { AppConfig, type ConfigEnv } from '@platform/config';
import { ConfigModule } from '@platform/config/nest';
import { BloomModule } from '@platform/bloom/nest';
import { CacheModule } from '@platform/cache/nest';
import { Clock, TransactionManager } from '@platform/kernel';
import { LoggerPort, MetricsPort, Tracing } from '@platform/observability';
import { ObservabilityModule } from '@platform/observability/nest';
import {
  type EnvelopePublisher,
  type Topology,
  topologyFromContracts,
} from '@platform/messaging';
import { MessagingModule } from '@platform/messaging/nest';
import {
  InternalApiModule,
  InternalTransportKind,
} from '@platform/internal-api/nest';
import { PersistenceModule } from '@platform/persistence/nest';
import { RateLimitModule } from '@platform/rate-limit/nest';
import { ResilienceModule } from '@platform/resilience/nest';
import { SagaModule } from '@platform/saga/nest';
import { SchedulingMode } from '@platform/scheduling';
import { SchedulingModule } from '@platform/scheduling/nest';
import { ShardKey } from '@platform/sharding';
import { ShardingModule } from '@platform/sharding/nest';
import { HealthModule } from '../health/health.module.js';
import type { ServiceDefinition } from '../../service-definition.js';
import { ServiceDatabaseSets } from '../../service-database-sets.js';
import { ServiceInternalTransport } from '../../service-internal-api.js';
import { UseCaseRunner } from '../../use-case-runner.js';
import { PlatformKernelModule } from './platform-kernel.module.js';
import type {
  PlatformRuntimeOptions,
  RuntimeAdapters,
} from './platform-runtime-options.js';
import { RuntimeAdapterSelector } from './runtime-adapter-selector.js';

/** Variables de entorno que el runtime lee además de las del esquema del servicio. */
enum RuntimeVariable {
  ValkeyAuth = 'VALKEY_AUTH',
}

/**
 * Composición de los módulos de librería de la plataforma para un servicio: configuración,
 * observabilidad, resiliencia, adaptadores, persistencia, sharding, caché, límite de tasa,
 * Bloom, mensajería, API interna, sagas, jobs y salud.
 *
 * El orden de `imports` fija el apagado. Nest destruye los módulos en orden inverso, así que lo que
 * cierra recursos (AWS, Valkey, persistencia) va antes y lo que genera trabajo (relay, jobs,
 * sagas, API interna) va después.
 */
@Module({})
export class PlatformRuntimeModule {
  static forService(
    definition: ServiceDefinition,
    options: PlatformRuntimeOptions,
  ): DynamicModule {
    const adapters = new RuntimeAdapterSelector().select(
      options.env,
      options.adapters,
    );
    const sets = new ServiceDatabaseSets().merge(definition.migrations);
    const topology = topologyFromContracts([
      definition.contract,
      ...(definition.peerContracts ?? []),
    ]);
    const elastiCacheIam =
      adapters.aws &&
      adapters.valkey &&
      PlatformRuntimeModule.usesIamToken(options.env);
    const publisher =
      options.publisher ?? (adapters.aws ? SnsSqsEnvelopePublisher : undefined);
    const ownPublishers = PlatformRuntimeModule.ownPublishers(
      options.publisher,
    );

    return {
      module: PlatformRuntimeModule,
      global: true,
      imports: [
        PlatformKernelModule,
        ConfigModule.forRoot({
          schema: definition.configSchema,
          env: options.env,
        }),
        ObservabilityModule.forRoot(
          options.telemetry === undefined
            ? {}
            : { telemetry: options.telemetry },
        ),
        ResilienceModule.forRoot({ metrics: MetricsPort }),
        ...PlatformRuntimeModule.adapterModules(
          definition.name,
          adapters,
          elastiCacheIam,
        ),
        PersistenceModule.forRoot({
          shard: sets.shard,
          catalog: sets.catalog,
          defaultSharding: {
            key: definition.sharding?.defaultKey ?? ShardKey.Tenant,
          },
          requireScope: definition.sharding?.requireScope ?? false,
          shardLister: DirectoryShardLister,
        }),
        PostgresPlatformModule.forRoot(),
        ShardingModule.forRoot({
          directory: TypeOrmDirectoryStore,
          ...(adapters.valkey
            ? {
                routingCache: ValkeyRoutingCache,
                channel: ValkeyShardDirectoryChannel,
              }
            : {}),
        }),
        CacheModule.forRoot({
          metrics: MetricsPort,
          ...(adapters.valkey ? { store: ValkeyCache } : {}),
        }),
        RateLimitModule.forRoot({
          degradeLocally: adapters.valkey,
          metrics: MetricsPort,
          logger: LoggerPort,
          ...(adapters.valkey ? { limiter: ValkeyRateLimiter } : {}),
        }),
        BloomModule.forRoot(
          adapters.valkey ? { factory: ValkeyBloomFilterFactory } : {},
        ),
        PlatformRuntimeModule.messagingModule(definition, topology, publisher),
        PlatformRuntimeModule.internalApiModule(definition),
        SagaPostgresModule,
        SagaModule.forRoot({
          store: TypeOrmSagaStore,
          scopes: ShardedSagaScopes,
        }),
        SchedulingModule.forRoot({
          mode: options.schedulingMode ?? SchedulingMode.InProcess,
          logger: LoggerPort,
          metrics: MetricsPort,
          ...(adapters.valkey ? { lock: ValkeyJobLock } : {}),
        }),
        HealthModule,
      ],
      providers: [
        PlatformRuntimeModule.useCaseRunnerProvider(),
        ...ownPublishers,
      ],
      exports: [UseCaseRunner, ...ownPublishers],
    };
  }

  private static adapterModules(
    serviceName: string,
    adapters: RuntimeAdapters,
    elastiCacheIam: boolean,
  ): DynamicModule[] {
    return [
      ...(adapters.aws
        ? [AwsModule.forRoot({ elastiCache: elastiCacheIam })]
        : []),
      ...(adapters.valkey
        ? [
            ValkeyModule.forRoot({
              connectionName: serviceName,
              ...(elastiCacheIam
                ? { authToken: ElastiCacheIamAuthTokenProvider }
                : {}),
            }),
          ]
        : []),
    ];
  }

  /**
   * `MessagingModule` inyecta el publicador por su tipo, así que uno propio se registra aquí. El de
   * AWS lo registra `AwsModule`.
   */
  private static messagingModule(
    definition: ServiceDefinition,
    topology: Topology,
    publisher: Type<EnvelopePublisher> | undefined,
  ): DynamicModule {
    return MessagingModule.forRoot({
      source: definition.name,
      consumer: definition.name,
      topology,
      outboxStore: TypeOrmOutboxStore,
      processedStore: TypeOrmProcessedMessageStore,
      relayScopes: ShardedRelayScopes,
      relay: publisher !== undefined,
      ...(publisher === undefined ? {} : { publisher }),
    });
  }

  private static internalApiModule(
    definition: ServiceDefinition,
  ): DynamicModule {
    const operations = Object.values(definition.contract.operations);
    const remoteOperations = (definition.peerContracts ?? []).flatMap(
      (contract) => Object.values(contract.operations),
    );
    const resolveHttp = definition.internalApi?.http;
    const extras = {
      transport:
        definition.internalApi?.transport === ServiceInternalTransport.Http
          ? InternalTransportKind.Http
          : InternalTransportKind.InProcess,
      processedStore: TypeOrmIdempotencyStore,
      purgeableStore: TypeOrmIdempotencyStore,
    };
    if (resolveHttp !== undefined) {
      return InternalApiModule.forRootAsync({
        useFactory: (config: AppConfig) => ({
          operations,
          remoteOperations,
          http: resolveHttp(config),
        }),
        inject: [AppConfig],
        ...extras,
      });
    }
    return InternalApiModule.forRoot({
      operations,
      remoteOperations,
      ...extras,
    });
  }

  /** `UseCaseRunner` no lleva decoradores para que el núcleo no importe NestJS; por eso se arma con una fábrica. */
  private static useCaseRunnerProvider(): Provider {
    return {
      provide: UseCaseRunner,
      useFactory: (
        tracing: Tracing,
        metrics: MetricsPort,
        transactions: TransactionManager,
        clock: Clock,
      ) => new UseCaseRunner(tracing, metrics, transactions, clock),
      inject: [Tracing, MetricsPort, TransactionManager, Clock],
    };
  }

  /** Los publicadores que no son el de AWS se registran aquí; el de AWS ya lo registra `AwsModule`. */
  private static ownPublishers(
    publisher: Type<EnvelopePublisher> | undefined,
  ): Type<EnvelopePublisher>[] {
    if (publisher === undefined || publisher === SnsSqsEnvelopePublisher) {
      return [];
    }
    return [publisher];
  }

  private static usesIamToken(env: ConfigEnv): boolean {
    const mode = env[RuntimeVariable.ValkeyAuth];
    return mode === ValkeyAuthMode.Iam || mode === ValkeyAuthMode.IamServerless;
  }
}
