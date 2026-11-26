# 0025. NestJS layer per sub-entry point and ports as abstract classes

- Status: Accepted, amended by [ADR 0044](0044-valkey-failure-policy.md) (outside `local` a service without Valkey does not start, and readiness does not include Valkey)
- Date: 2026-11-14

## Context

The platform libraries had no NestJS wiring. Each service wired ports and adapters by hand with factories, and the ports were interfaces without an injection token, so each one needed a `Symbol` and an `@Inject`. That code was repeated in every service and tied each one's bootstrap to the library's details.

## Decision

### Ports as abstract classes

Every port is an abstract class without decorators, and it is its own injection token. The domain does not import NestJS. A `Symbol` is used only when several instances of the same type coexist (`SNS_CLIENT`, `SQS_CLIENT` or a Bloom filter by name with `bloomFilterToken(name)`).

Turning an interface into an abstract class does not break its implementers, nor doubles made with object literals, as long as the class only has abstract members.

```ts
export abstract class Clock {
  abstract now(): Date;
}
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
```

### The nest sub-entry point

Each library with wiring exposes `@platform/<lib>/nest`, which points to `src/nest/index.ts`. Outside `src/nest/` nothing imports `@nestjs/*` or another `/nest` sub-entry point. This is checked by the ESLint rule `layout/no-nest-outside-nest-folder` in `backend/eslint.config.mjs` and by `check-structure.mjs`. `domain/` already had its own rule.

### Configurable modules

`ConfigurableModuleBuilder` from `@nestjs/common` is used, which generates `forRoot` and `forRootAsync` without in-house code. `forFeature` is written by hand when the service registers something of its own.

```ts
// @platform/cache/src/nest/cache.module-definition.ts
export const {
  ConfigurableModuleClass: CacheModuleClass,
  MODULE_OPTIONS_TOKEN: CACHE_OPTIONS,
} = new ConfigurableModuleBuilder<CacheModuleOptions>()
  .setClassMethodName('forRoot')
  .build();

// @platform/cache/src/nest/cache.module.ts
@Module({})
export class CacheModule extends CacheModuleClass {
  static forFeature(feature: CacheFeatureOptions): DynamicModule;
}
```

### Who chooses the adapter

A core module never imports an adapter, because the dependency would point the wrong way. The option receives the adapter's type and the module binds it to the port.

```ts
export interface CacheModuleOptions {
  /** Defaults to `InMemoryCache`, the local mode without Valkey. */
  readonly store?: Type<CachePort>;
}
// in CacheModule: { provide: CachePort, useExisting: options.store ?? InMemoryCache }
```

Without the option, the module gets the local mode. The other options follow the same pattern: `RateLimitModule` (`limiter`, `degradeLocally`), `ShardingModule` (`routingCache`, `channel`, `directory`), `MessagingModule` (`outboxStore`, `processedStore`, `bus`, `publisher`), `InternalApiModule` (`processedStore`) and `SagaModule` (`store`). The adapter exports its classes from its module and the app names them.

### Configuration

`ConfigModule.forRoot({ schema })` receives only the service's own schema. Each library module imports `ConfigModule.forFeature(section)` with its section (`LoggingConfig`, `TelemetryConfig`, `DatabaseConfig`, `ValkeyConfig`, `AwsConfig`), and it is read with `AppConfig.get(section)`. That way the service does not write `.extend(...)` or know variables that are not its own. Everything is validated at startup, and if something fails the startup lists all the errors at once.

### Lifecycle

There are three moments, in this shutdown order:

1. `OnModuleDestroy` of what generates work: `JobRunner`, `SqsPoller` and the subscriptions. Their modules are not global and are imported later, so Nest destroys them first.
2. `OnModuleDestroy` of the resources, in global modules imported earlier: SNS and SQS clients (`AwsModule`, which only implements this hook), Valkey with `quit` and the TypeORM `DataSource`.
3. `OnApplicationShutdown` flushes the telemetry.

### Health

`HealthRegistry` lives in observability, with `register(check)` and `checkAll()`, and `HealthCheckable` lives in the kernel. Each network adapter registers itself in its `onModuleInit`. The `/health/live` and `/health/ready` endpoints are mounted by F4 in `@platform/http` on top of `HealthRegistry`.

### Telemetry

The early bootstrap is kept outside Nest, in `@platform/observability/setup`. It must patch http, pg and iovalkey before they are imported, so `instrumentation.ts` is the first import of `main.ts`. `ObservabilityModule` provides `TELEMETRY` with that value and only governs shutdown.

```ts
// instrumentation.ts, first import of main.ts
import { TelemetryBootstrap } from '@platform/observability/setup';
export const telemetry = TelemetryBootstrap.start(process.env);
```

### Test doubles

Doubles are exported through `@platform/<lib>/test-utils`, not through the public index. Each double passes the same `run<Port>Contract(factory)` contract test as the real adapter.

### Modules per library

| Library           | Module                   | Provides                                                                                                                                                                       |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| config            | `ConfigModule`           | `AppConfig`                                                                                                                                                                    |
| observability     | `ObservabilityModule`    | `LoggerPort`, `MetricsPort`, `RequestContextStore`, `Tracing`, `Redactor`, `HealthRegistry`, `TELEMETRY`                                                                       |
| resilience        | `ResilienceModule`       | `ResilienceRegistry`; `forFeature({ name, policy })` adds a policy                                                                                                             |
| cache             | `CacheModule`            | `CachePort`, `SingleFlight`, `CacheAside` per namespace (`cacheAsideToken(namespace)`)                                                                                         |
| rate-limit        | `RateLimitModule`        | `RateLimiter`, `RateLimitGuard`                                                                                                                                                |
| bloom             | `BloomModule`            | `bloomFilterToken(name)` per `forFeature`, `BloomRebuildJob`                                                                                                                   |
| scheduling        | `SchedulingModule`       | `JobRunner`, `JobLock`                                                                                                                                                         |
| sharding          | `ShardingModule`         | `ShardRouter`, `DirectoryChangeSubscription`                                                                                                                                   |
| messaging         | `MessagingModule`        | `OutboxWriter`, `MessageBus`, `MessageDispatcher`, `OutboxRelay`, `MessagingExplorer`, jobs                                                                                    |
| internal-api      | `InternalApiModule`      | `InternalClient`, `InternalRouter`, `Transport`, `InternalApiController`, jobs                                                                                                 |
| persistence       | `PersistenceModule`      | `TransactionManager`, `EntityManagerProvider`, `ShardResolver`, `ShardScope`, `AcrossShards`                                                                                   |
| adapters-postgres | `PostgresPlatformModule` | `TypeOrmOutboxStore`, `TypeOrmProcessedMessageStore`, `TypeOrmIdempotencyStore`, `TypeOrmDirectoryStore`                                                                       |
| saga              | `SagaModule`             | `Sagas`, `SagaEngine`, `SagaRecoveryJob`, `SagaRetentionJob`; `forFeature([definitions])`                                                                                      |
| adapters-aws      | `AwsModule`              | `SNS_CLIENT`, `SQS_CLIENT`, `SnsSqsMessageBus`, `SnsSqsEnvelopePublisher`, `AwsMessagingNames`, `AwsErrorTranslator`; `SqsConsumerModule` (not global) provides `SqsPoller`    |
| adapters-valkey   | `ValkeyModule`           | `VALKEY_CLIENT`, `ValkeyCache`, `ValkeyRateLimiter`, `ValkeyRoutingCache`, `ValkeyShardDirectoryChannel`, `ValkeyBloomFilterFactory`, `ValkeyJobLock`, `ValkeyHealthIndicator` |

## Consequences

### Positive

- The service only names adapters and its configuration schema.
- The domain still does not depend on NestJS.
- A service without Valkey starts in local mode without changing code.
- Doubles stay out of the public index.

### Costs

- Each library adds a `src/nest` folder and a sub-entry point in `tsconfig.base.json`.
- New dependencies: `@nestjs/common`, `@nestjs/core`, `@nestjs/testing`, `reflect-metadata` and `rxjs`.
- The consumers of the previous interfaces have to be migrated. The compatibility re-exports have already been removed.

## Alternatives considered

- Each service wiring the ports by hand: that is the previous state, and the wiring is repeated in every service.
- A core module importing the adapter: the dependency would point the wrong way.
- Moving the OpenTelemetry bootstrap to `ObservabilityModule`: it breaks automatic instrumentation, which must patch before http, pg and iovalkey are imported.
- A `@Resilient` decorator: discarded, because `ResilienceRegistry.execute` is the only path.
