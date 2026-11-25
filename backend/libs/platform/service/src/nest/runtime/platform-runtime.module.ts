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
import { CriteriaModule } from '@platform/criteria/nest';
import { KernelModule } from '@platform/kernel/nest';
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
import type {
  PlatformRuntimeOptions,
  RuntimeAdapters,
} from './platform-runtime-options.js';
import { RuntimeAdapterSelector } from './runtime-adapter-selector.js';

/** Environment variables the runtime reads in addition to those of the service schema. */
enum RuntimeVariable {
  ValkeyAuth = 'VALKEY_AUTH',
}

/**
 * Composition of the platform library modules for a service: configuration,
 * observability, resilience, adapters, persistence, sharding, cache, rate limiting,
 * Bloom, messaging, internal API, sagas, jobs and health.
 *
 * The order of `imports` sets the shutdown. Nest destroys modules in reverse order, so what
 * closes resources (AWS, Valkey, persistence) goes first and what generates work (relay, jobs,
 * sagas, internal API) goes after.
 */
@Module({})
export class PlatformRuntimeModule {
  /** How often a waiting write checks the gate again. */
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
        KernelModule,
        CriteriaModule,
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
   * The router rejects tenants of another region with the URL of their API (`REGIONS` and `SERVICE_REGION`), and the
   * write gate for moves is closed in the directory or, with `TENANT_WRITE_GATE=valkey`, in Valkey.
   * @throws InvalidServiceDefinitionError if `TENANT_WRITE_GATE` is not a known value or asks for Valkey without Valkey.
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
   * The gate is chosen when composing the modules, before the configuration context exists, so its
   * section is validated here with the same schema that later injects it.
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
   * `MessagingModule` injects the publisher by its type, so a custom one is registered here. The
   * AWS one is registered by `AwsModule`. With `requireScope` each delivery runs in the shard of its envelope's tenant
   * (the `processed_messages` claim lives there) and only tenants that the directory places are accepted.
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
          clock: Clock,
          credentials?: AwsCredentialsProvider,
          aws?: AwsSettings,
        ) => ({
          operations,
          remoteOperations,
          http: resolveHttp(config, {
            clock,
            ...(credentials === undefined || aws === undefined
              ? {}
              : { aws: { credentials, region: aws.AWS_REGION } }),
          }),
        }),
        inject: [
          AppConfig,
          Clock,
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
   * With `requireScope` the shard of an internal operation is decided by its handler from the input (for example
   * the user and their home tenant), so the idempotency key cannot live in a shard that is not yet
   * known: it goes to the catalog and the handler opens its own transactions within its `ShardScope`.
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

  /** The tenant verifier and the delivery context of a sharded service, built with factories. */
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

  /** The classifier with the Postgres, AWS and Valkey rules, for the internal API, the consumers and the sagas. */
  private static failureClassifierProvider(): Provider {
    return {
      provide: FailureClassifier,
      useFactory: () => new PlatformFailureClassifier(),
    };
  }

  /** `UseCaseRunner` has no decorators so the core does not import NestJS; that is why it is built with a factory. */
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

  /** Publishers other than the AWS one are registered here; `AwsModule` already registers the AWS one. */
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
