import {
  Module,
  type DynamicModule,
  type Provider,
  type Type,
} from '@nestjs/common';
import {
  AwsConfig,
  AwsCredentialsProvider,
  ElastiCacheIamAuthTokenProvider,
  SnsSqsEnvelopePublisher,
  type AwsSettings,
} from '@platform/adapters-aws';
import { AwsModule } from '@platform/adapters-aws/nest';
import {
  CatalogIdempotencyStore,
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
  ValkeyWriteGate,
} from '@platform/adapters-valkey';
import { ValkeyModule } from '@platform/adapters-valkey/nest';
import { AppConfig, type ConfigEnv } from '@platform/config';
import { ConfigModule } from '@platform/config/nest';
import { BloomModule } from '@platform/bloom/nest';
import { CacheModule } from '@platform/cache/nest';
import { Clock, TransactionManager } from '@platform/kernel';
import {
  LoggerPort,
  MetricsPort,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import { ObservabilityModule } from '@platform/observability/nest';
import {
  type EnvelopePublisher,
  type Topology,
  topologyFromContracts,
} from '@platform/messaging';
import { MessagingModule } from '@platform/messaging/nest';
import {
  HandlerUnitOfWork,
  InternalApiModule,
  InternalTransportKind,
} from '@platform/internal-api/nest';
import { ShardScope } from '@platform/persistence';
import { FailureClassifier } from '@platform/primitives';
import { PersistenceModule } from '@platform/persistence/nest';
import { RateLimitModule } from '@platform/rate-limit/nest';
import { ResilienceModule } from '@platform/resilience/nest';
import { SagaModule } from '@platform/saga/nest';
import { SchedulingMode } from '@platform/scheduling';
import { SchedulingModule } from '@platform/scheduling/nest';
import { ShardKey, ShardRouter } from '@platform/sharding';
import { ShardingModule } from '@platform/sharding/nest';
import { InvalidServiceDefinitionError } from '../../errors/invalid-service-definition.error.js';
import { PlatformFailureClassifier } from '../../failures/platform-failure-classifier.js';
import {
  RegionsConfig,
  ServiceRegions,
  type RegionsSettings,
} from '../../regions/regions.config.js';
import { TenantWriteGateKind } from '../../regions/tenant-write-gate-kind.enum.js';
import {
  TenantWritesConfig,
  tenantWritesConfigSchema,
  type TenantWritesSettings,
} from '../../regions/tenant-writes.config.js';
import { HealthModule } from '../health/health.module.js';
import { PlacedTenantVerifier } from '../../messaging/placed-tenant-verifier.js';
import { TenantShardDeliveryContext } from '../../messaging/tenant-shard-delivery-context.js';
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
  /** Cada cuánto vuelve a mirar la compuerta una escritura que espera. */
  private static readonly WRITE_GATE_POLL_MS = 100;

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
    const deliveryProviders =
      definition.sharding?.requireScope === true
        ? PlatformRuntimeModule.tenantDeliveryProviders()
        : [];

    return {
      module: PlatformRuntimeModule,
      global: true,
      imports: [
        PlatformKernelModule,
        ConfigModule.forRoot({
          schema: definition.configSchema,
          env: options.env,
        }),
        ConfigModule.forFeature(RegionsConfig),
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
          tenantMoves: true,
        }),
        PostgresPlatformModule.forRoot(),
        PlatformRuntimeModule.shardingModule(
          definition.name,
          options.env,
          adapters,
        ),
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
        PlatformRuntimeModule.failureClassifierProvider(),
        PlatformRuntimeModule.useCaseRunnerProvider(),
        PlatformRuntimeModule.regionsProvider(),
        ...ownPublishers,
        ...deliveryProviders,
      ],
      exports: [
        FailureClassifier,
        UseCaseRunner,
        ServiceRegions,
        ...ownPublishers,
        ...deliveryProviders.map((provider) => provider.provide),
      ],
    };
  }

  /**
   * El router rechaza los tenants de otra región con la URL de su API (`REGIONS` y `SERVICE_REGION`), y la compuerta
   * de escritura de los traslados se cierra en el directorio o, con `TENANT_WRITE_GATE=valkey`, en Valkey.
   * @throws InvalidServiceDefinitionError si `TENANT_WRITE_GATE` no es un valor conocido o pide Valkey sin Valkey.
   */
  private static shardingModule(
    serviceName: string,
    env: ConfigEnv,
    adapters: RuntimeAdapters,
  ): DynamicModule {
    return ShardingModule.forRootAsync({
      imports: [
        ConfigModule.forFeature(RegionsConfig),
        ConfigModule.forFeature(TenantWritesConfig),
      ],
      useFactory: (regions: RegionsSettings, writes: TenantWritesSettings) => ({
        router: {
          currentRegion: regions.SERVICE_REGION,
          regions: regions.REGIONS,
        },
        writeWait: {
          maxWaitMs: writes.TENANT_MOVE_MAX_WAIT_MS,
          pollMs: PlatformRuntimeModule.WRITE_GATE_POLL_MS,
        },
      }),
      inject: [RegionsConfig.token, TenantWritesConfig.token],
      directory: TypeOrmDirectoryStore,
      ...(adapters.valkey
        ? {
            routingCache: ValkeyRoutingCache,
            channel: ValkeyShardDirectoryChannel,
          }
        : {}),
      ...(PlatformRuntimeModule.writeGateOf(serviceName, env, adapters) ===
      TenantWriteGateKind.Valkey
        ? { writeGate: ValkeyWriteGate }
        : {}),
    });
  }

  /**
   * La compuerta se elige al componer los módulos, antes de que exista el contexto de configuración, así que su
   * sección se valida aquí con el mismo esquema que después la inyecta.
   */
  private static writeGateOf(
    serviceName: string,
    env: ConfigEnv,
    adapters: RuntimeAdapters,
  ): TenantWriteGateKind {
    const parsed = tenantWritesConfigSchema.safeParse(env);
    if (!parsed.success) {
      throw new InvalidServiceDefinitionError(
        serviceName,
        `TENANT_WRITE_GATE must be one of ${Object.values(TenantWriteGateKind).join(', ')} and TENANT_MOVE_MAX_WAIT_MS a number of milliseconds`,
      );
    }
    const kind = parsed.data.TENANT_WRITE_GATE;
    if (kind === TenantWriteGateKind.Valkey && !adapters.valkey) {
      throw new InvalidServiceDefinitionError(
        serviceName,
        'TENANT_WRITE_GATE=valkey needs Valkey configured',
      );
    }
    return kind;
  }

  private static regionsProvider(): Provider {
    return {
      provide: ServiceRegions,
      useFactory: (settings: RegionsSettings) => new ServiceRegions(settings),
      inject: [RegionsConfig.token],
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
   * AWS lo registra `AwsModule`. Con `requireScope` cada entrega corre en el shard del tenant de su sobre
   * (el claim de `processed_messages` vive ahí) y solo se aceptan tenants que el directorio ubica.
   */
  private static messagingModule(
    definition: ServiceDefinition,
    topology: Topology,
    publisher: Type<EnvelopePublisher> | undefined,
  ): DynamicModule {
    const scoped =
      definition.sharding?.requireScope === true
        ? {
            tenantVerifier: PlacedTenantVerifier,
            deliveryContext: TenantShardDeliveryContext,
          }
        : {};
    return MessagingModule.forRoot({
      ...scoped,
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
      ...PlatformRuntimeModule.idempotencyFor(definition),
    };
    if (resolveHttp !== undefined) {
      return InternalApiModule.forRootAsync({
        useFactory: (
          config: AppConfig,
          credentials?: AwsCredentialsProvider,
          aws?: AwsSettings,
        ) => ({
          operations,
          remoteOperations,
          http: resolveHttp(config, {
            ...(credentials === undefined || aws === undefined
              ? {}
              : { aws: { credentials, region: aws.AWS_REGION } }),
          }),
        }),
        inject: [
          AppConfig,
          { token: AwsCredentialsProvider, optional: true },
          { token: AwsConfig.token, optional: true },
        ],
        ...extras,
      });
    }
    return InternalApiModule.forRoot({
      operations,
      remoteOperations,
      ...extras,
    });
  }

  /**
   * Con `requireScope` el shard de una operación interna lo decide su handler con la entrada (por ejemplo
   * el usuario y su tenant de origen), así que la llave de idempotencia no puede vivir en un shard que aún no
   * se conoce: va al catálogo y el handler abre sus propias transacciones dentro de su `ShardScope`.
   */
  private static idempotencyFor(definition: ServiceDefinition): {
    processedStore: typeof TypeOrmIdempotencyStore;
    purgeableStore: typeof TypeOrmIdempotencyStore;
    unitOfWork: HandlerUnitOfWork;
  } {
    if (definition.sharding?.requireScope === true) {
      return {
        processedStore: CatalogIdempotencyStore,
        purgeableStore: CatalogIdempotencyStore,
        unitOfWork: HandlerUnitOfWork.Handler,
      };
    }
    return {
      processedStore: TypeOrmIdempotencyStore,
      purgeableStore: TypeOrmIdempotencyStore,
      unitOfWork: HandlerUnitOfWork.Shared,
    };
  }

  /** El verificador de tenants y el contexto de entrega de un servicio con shards, armados con fábricas. */
  private static tenantDeliveryProviders(): Array<
    Provider & { provide: Type<unknown> }
  > {
    return [
      {
        provide: PlacedTenantVerifier,
        useFactory: (router: ShardRouter) => new PlacedTenantVerifier(router),
        inject: [ShardRouter],
      },
      {
        provide: TenantShardDeliveryContext,
        useFactory: (scope: ShardScope, context: RequestContextStore) =>
          new TenantShardDeliveryContext(scope, context),
        inject: [ShardScope, RequestContextStore],
      },
    ];
  }

  /** El clasificador con las reglas de Postgres, AWS y Valkey, para la API interna, los consumidores y las sagas. */
  private static failureClassifierProvider(): Provider {
    return {
      provide: FailureClassifier,
      useFactory: () => new PlatformFailureClassifier(),
    };
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
