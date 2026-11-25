# Backend review remediation plan

- Status: Approved by the user
- Date: 2026-11-14
- Source: [backend review](../audits/2026-11-14-backend-review.md)
- Designs integrated without redesign: [TypeORM persistence and sagas](../design/typeorm-persistence-and-sagas.md) and, as a consumer, [F4 identity](../design/f4-identity.md)
- Order of the waves alongside the front and F4, status of each package and how the squads work: [plan](README.md)
- Paths are relative to the repository root unless stated otherwise. Effort: S (less than half a day), M (one to three days), L (more than three days).

## 0. Summary

The plan closes the findings in five waves of three packages, one squad per package. Wave 0 sets the foundations, waves 1 to 3 rebuild the libraries by dependency layer, and wave 4 closes the base and starts F4 on top of it.

| Wave | Result                                                                            |
| ---- | --------------------------------------------------------------------------------- |
| 0    | New kernel and primitives, aliases and dependencies for the whole plan, new rules |
| 1    | Core NestJS modules, job runner, `ShardRouter` split                              |
| 2    | Operable outbox and consumers, HTTP transport, TypeORM layer with sharding        |
| 3    | TypeORM stores, adapters with a module, persistent sagas                          |
| 4    | Clean catalog, platform smoke test, F4 starts                                     |

The packages of each wave are in the [plan](README.md#execution-order-by-waves) and their sheet in section 3.

Everything that calls the libraries today is tests: `backend/apps` does not exist yet. That is why API-breaking changes are cheap now and expensive after F4. That is the reason for the order.

## 1. Verification of the findings

Each finding was checked against the code before planning. What was verified directly:

- T1: there is no `@Module`, `@Injectable` or `@nestjs/*` in `backend/libs`, and `backend/package.json` only brings `@opentelemetry/instrumentation-nestjs-core`. It holds.
- T2: `CacheErrorCode`, `ConfigErrorCode`, `ShardingErrorCode`, `BloomErrorCode`, `ValkeyErrorCode` and `CriteriaErrorCode` exist, in addition to `PlatformErrorCode`. It holds.
- KRN-1: `kernel/src/invalid-id.error.ts` imports `@contracts/platform`. It holds.
- CFG-2 and OBS: `observability/src/logger.ts` imports `LogLevel` from `@platform/config`, and `telemetry.ts` imports `BaseConfig`. It holds.
- MSG-1: `relayOnce` only appears in a comment in `outbox-message-bus.ts`; `purgeCompleted` and `SagaRecoveryJob.runOnce` have no caller. It holds.
- T4: `Math.random` as the default in cache, internal-api, observability, primitives, resilience and saga, plus `randomUUID` and `randomBytes` in cache and observability. It holds.
- T5: `messaging/src/index.ts`, `saga/src/index.ts` and `sharding/src/index.ts` export the `InMemory*` classes. It holds.
- T9: `jest.preset.js` picks up `*.?(int-)spec.ts`, so `*.integration.spec.ts` runs as a unit test. It holds.
- SHD-5: `MAX_TENANT_ID_LENGTH` is 64 in the router and 128 in internal-api and in the messaging envelope. It holds.
- MSG-5: there are three live `@deprecated` (`LegacyBackoffOptions`, `newId`, `now`). It holds.
- MSG-7 and CTR-3: two messaging name patterns and two error code patterns, with different expressions. It holds.
- RES-1: the only consumer of `ResiliencePolicyName` outside resilience is cache (`Cache`). It holds.
- UTL-1: nobody imports `@shared/utils`. It holds.
- INT-1: `InProcessTransport` is the only `Transport` class. It holds.
- KRN-3: `result.ts` is exported from the kernel and no other file uses `ok`, `err`, `isOk` or `isErr`. It holds.
- `check-structure.mjs --all` reports 97 violations today, as the report says.

Findings that do not hold or are adjusted:

| Id    | Decision               | Reason                                                                                                                                                                                                                                                                      |
| ----- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CTR-4 | Dismissed              | The report itself concludes that `new Date(...)` in `define-route.ts` is parsing, not reading the clock.                                                                                                                                                                    |
| CFG-5 | Out of the plan        | `SecretsProvider` with Secrets Manager does not fix a defect: it is a new feature with no consumer today. It comes in when F12 asks for it. Only the part about `Secret` with a private field (CFG-4) is addressed.                                                         |
| VLK-4 | Out of the plan        | The report itself marks it as a product decision.                                                                                                                                                                                                                           |
| MSG-4 | Deferred               | Deleting the topology DSL breaks about 36 tests and the value is cleanup, not correctness. Only the clash of name patterns (MSG-7) is resolved.                                                                                                                             |
| KRN-3 | Adjusted               | The report proposes a single `ERROR_CODE_PATTERN` in the kernel. The Nx boundary rule prevents `type:contracts` from depending on the kernel. It is resolved with two rules and a consistency test (decision D2).                                                           |
| OBS-3 | Corrected              | Moving the OpenTelemetry startup to `ObservabilityModule` breaks automatic instrumentation, which must patch before importing `http`, `pg` and `iovalkey`. `@platform/observability/setup` is kept as the early startup and the module only governs shutdown (decision D3). |
| AWS-3 | Contradiction resolved | The report says both that `elasticache-iam-auth` belongs to Valkey and that it must stay in aws. It stays in `adapters/aws` (the only place with `@aws-sdk`) and `ValkeyModule` receives it through an optional token.                                                      |
| PRM-1 | Adjusted               | The transaction and idempotency ports go to `kernel/src/ports/`, not to a new primitives folder, so the domain and persistence import them without going through primitives.                                                                                                |
| BLO-1 | Adjusted               | The report hesitates between scheduling `rebuildCron` or deleting it. It is scheduled: `ScheduledJob` exists (D4), so the field has a consumer.                                                                                                                             |
| T2    | Adjusted               | The report asks to clean up the central catalog at the same time as each library migrates. That forces several squads to edit the same file. Each library declares its catalog in its wave and a single squad cleans up the central one in wave 4 (WP-13).                  |

## 2. Design decisions

The signatures are the contract that each squad's guide sets as a skeleton before splitting the work. Domain types that already exist (`MessageEnvelope`, `Placement`, `CallOutcome`) keep their current shape; the names of new collaborators are proposals that the guide can refine as long as they do not change the public API.

### D1. Foundations (`@platform/kernel` and `@platform/primitives`)

**Port rule.** Every port is an abstract class without decorators. The class is its own injection token and the domain does not import NestJS. A `Symbol` is only used when several instances of the same type coexist (`SNS_CLIENT`, `SQS_CLIENT`, a Bloom filter by name).

Turning an interface into an abstract class does not break its implementers or test doubles built with object literals, as long as the class only has abstract members. That is why `Clock`, `IdGenerator`, `TransactionManager` and `IdempotencyStore` are converted without changing their members.

```ts
// @platform/kernel
export abstract class Clock {
  abstract now(): Date;
}
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}

export abstract class RandomSource {
  /** Value in [0, 1). */
  abstract next(): number;
  abstract bytes(length: number): Uint8Array;
}
export class SystemRandomSource extends RandomSource {
  next(): number {
    return Math.random();
  }
  bytes(length: number): Uint8Array {
    return randomBytes(length);
  }
}

export abstract class IdGenerator {
  abstract next(): Id;
}
export class UuidV7IdGenerator extends IdGenerator {
  constructor(private readonly clock: Clock) {
    super();
  }
  next(): Id {
    /* ... uses this.clock.now().getTime() ... */
  }
}
```

`RandomSource` closes T4. The seven `random?: () => number` options and the direct `randomUUID` calls go away. `VersionedKeyspace` tokens come from `IdGenerator`; span ids come from `RandomSource.bytes(8)`.

**Guards (T7).** A class with the error as a collaborator, so each library keeps throwing its own type:

```ts
export type GuardFailure = (message: string) => Error;

export class Guard {
  static readonly default = new Guard();
  constructor(
    private readonly fail: GuardFailure = (m) => new InvalidArgumentError(m),
  ) {}
  positiveInteger(name: string, value: number): number;
  nonNegativeInteger(name: string, value: number): number;
  nonNegativeFinite(name: string, value: number): number;
  integerInRange(name: string, value: number, min: number, max: number): number;
  nonEmpty(name: string, value: string): string;
  matches(name: string, value: string, pattern: RegExp): string;
}

// In a library:
private readonly guard = new Guard(
  (message) => new CacheError(CacheErrorCode.InvalidOptions, message),
);
```

It replaces `assertNonNegativeFinite`, `assertBudget`, `assertCapacity`, `assertTtl`, `assertLease`, `assertPositiveInteger`, `assertFinite`, `assertIntegerInRange`, `isPositiveInt` and `assertIdentifier`. The returned values allow validating on assignment.

**Error description (T7, OBS-5).**

```ts
export interface ErrorDescription {
  readonly name: string;
  readonly code?: string;
  readonly message: string;
}

export class ErrorDescriptor {
  static describe(error: unknown): ErrorDescription;
  static codeOf(error: unknown): string | undefined;
}
```

`codeOf` only returns the code if it satisfies `ErrorCode.isValid`. It replaces `describeError` (resilience and messaging), `codeOf` (field-errors and message-dispatcher), `reasonOf` and the extraction in `errorMetricAttributes` and `recordSpanError`. It is static because it has no state or dependencies.

**Errors (KRN-2).** `PlatformError` computes `failureKind` in the constructor and the `abstract readonly failureKind` of each subclass is deleted:

```ts
export interface PlatformErrorOptions {
  readonly retryable?: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
  /** Default: Transient if retryable, Permanent otherwise. */
  readonly failureKind?: FailureKind;
}

export abstract class PlatformError extends Error {
  abstract readonly code: string;
  readonly failureKind: FailureKind;
  readonly retryable: boolean;
  readonly details?: Readonly<Record<string, unknown>>;
  protected constructor(message: string, options?: PlatformErrorOptions);
  static is(value: unknown): value is PlatformError;
}

export class ErrorCode {
  static readonly PATTERN = /^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$/;
  static isValid(value: unknown): value is string;
}
```

`DomainError` passes `failureKind` to `super` and stops computing it. `isErrorCode` and `isPlatformError` become `ErrorCode.isValid` and `PlatformError.is`. `KernelErrorCode.InvalidId` replaces the `PlatformErrorCode` in `InvalidIdError`, and the kernel stops importing `@contracts/platform` (KRN-1).

**Ports that move to the kernel (PRM-1).** `kernel/src/ports/transaction/` receives `TransactionManager`, `UnitOfWork`, `TransactionHook`, `TransactionOptions` and `IsolationLevel`. `kernel/src/ports/idempotency/` receives `IdempotencyStore`, `ClaimState`, `ClaimRequest`, `ClaimResult`, `AcquiredClaim`, `InProgressClaim` and `CompletedClaim`. `primitives` re-exports them with `@deprecated` until wave 4 (WP-13) and persistence deletes its copy of `IsolationLevel` in WP-09.

The kernel also gets, next to the ports:

```ts
export abstract class PurgeableStore {
  /** Deletes what finished before `before`. Returns how many records it removed. */
  abstract purgeCompleted(before: Date): Promise<number>;
}

export enum HealthState {
  Up = 'up',
  Degraded = 'degraded',
  Down = 'down',
}
export interface HealthReport {
  readonly state: HealthState;
  readonly detail?: string;
}
export abstract class HealthCheckable {
  abstract readonly name: string;
  abstract check(signal?: AbortSignal): Promise<HealthReport>;
}

/** Tenant value object. A single maximum length for the whole platform (SHD-5). */
export class TenantId extends ValueObject<{ value: string }> {
  static readonly MAX_LENGTH = 128;
  static from(raw: string): TenantId;
  get value(): string;
}
```

The kernel's `Result` is deleted (KRN-3): no library uses it and `CallOutcome` covers the case. `Id` stays; WP-09 brings the `IdTransformer` for `uuid` columns. `Money` moves from `shared/utils` to the kernel as a `ValueObject` (`Money.of(amountMinor, currency)`, `add`, `subtract`, `multiply`, `allocate`, `compareTo`, `format`) and `libs/shared/utils` is removed.

**Primitives as pure computation (PRM-2, T3).**

```ts
export class RetryPolicy {
  constructor(
    readonly maxAttempts: number,
    readonly baseMs: number,
    readonly maxMs: number,
    readonly strategy: BackoffStrategy,
  );
  static readonly none: RetryPolicy;
}

export class Backoff {
  constructor(policy: RetryPolicy, random: RandomSource);
  delay(attempt: number): number;
}

export class Deadline {
  constructor(budgetMs: number, clock: Clock);
  remainingMs(): number;
  /** Runs `work` within the deadline; aborts on `signal` or when it expires. */
  race<T>(work: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T>;
  /** Waits for an already created promise within the deadline. */
  wait<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T>;
  sleep(ms: number, signal?: AbortSignal): Promise<void>;
}

export class FailureClassifier {
  constructor(rules?: readonly FailureRule[]);
  classify(error: unknown): FailureKind;
  isTransient(error: unknown): boolean;
}
export class RetryAfterParser {
  constructor(clock: Clock);
  parse(header: string | undefined): number | undefined;
}
export class CanonicalJson {
  static canonicalize(value: unknown): unknown;
  static stringify(value: unknown): string;
  static digest(value: unknown): string;
}
export class Hashes {
  static fnv1a32(text: string): number;
  static fnv1a32Hex(text: string): string;
}
```

A single `RetryPolicy` replaces the four current shapes (`RetryPolicy` from internal-api and from messaging, `ResilienceRetryConfig`, `OperationRetryPolicy`). Each library reuses it in its wave. `Deadline` absorbs `raceDeadline`, `abortableSleep`, `armTimer`, cache's `wait.ts` and `LookupBudget`, and uses the `Clock` instead of `Date.now()`. `MAX_TIMER_MS` lives in a single place.

**ContainerRuntime (T6).** In `@platform/kernel/test-utils`:

```ts
export enum IntegrationMode {
  Skip = 'skip',
  Require = 'require',
}

export class ContainerRuntime {
  constructor(env: Readonly<Record<string, string | undefined>>);
  /** Value of INTEGRATION_TESTS. Skip by default outside CI. */
  get mode(): IntegrationMode;
  isAvailable(): Promise<boolean>;
  /** `describe` that is skipped without Docker in Skip mode and fails in Require mode. */
  describeIfAvailable(name: string, body: () => void): void;
}
```

A single variable, `INTEGRATION_TESTS=skip|require`, and the four copies and the `POSTGRES_ADAPTER_INTEGRATION`, `PERSISTENCE_INTEGRATION` and `VALKEY_INTEGRATION` flags are deleted. CI uses `require`.

### D2. Errors and catalog per library

- Each library has a single code enum, its own, with the `PLATFORM.<LIB>.<ERROR>` format. Those that use `PlatformErrorCode` today create their own in their wave and copy the same values, so no observable code changes.
- One error class per file, with the `Error` suffix (`InvalidParametersError`, `CorruptedDataError`, `IncompatibleFiltersError`), which passes its `code` and relies on `PlatformError` for `failureKind`.
- Each library declares its catalog in `src/errors/<lib>-error-catalog.ts` with the existing declarative factory:

```ts
// @platform/cache/src/errors/cache-error-catalog.ts
export const cacheErrorCatalog = defineErrorCatalog(CacheErrorCode, {
  [CacheErrorCode.Unavailable]: internal(503, true, 'El caché no responde.'),
  [CacheErrorCode.ValueTooLarge]: internal(
    413,
    false,
    'El valor supera el máximo.',
  ),
});
```

- The kernel does not depend on contracts, so the `KernelErrorCode` catalog lives in `primitives`.
- `@contracts/platform` keeps only the cross-cutting, public codes. The service composes its catalog: `ErrorCatalogRegistry` (F4) and `defineServiceContract` receive `platformErrorCatalog` plus those of the libraries it uses. The platform contract stops knowing about `saga`, `bloom` or `valkey` (CTR-1).
- Code pattern: two expressions are kept, `ErrorCode.PATTERN` in the kernel and `ERROR_CODE_PATTERN` in contracts, because `type:contracts` cannot depend on the kernel. They are unified in value (the kernel's) and a test in `primitives` walks every catalog and checks that each code satisfies both.
- Delivery order: WP-01 leaves the mechanism in place; each library migrates its enum and declares its catalog in its wave; WP-13 deletes the internal codes from `platform-error-code.enum.ts` and `platform-error-catalog.ts`, the only change to those files after WP-01.

### D3. NestJS modules per library

**Sub-entry.** Each library with wiring exposes `@platform/<lib>/nest`, which points to `src/nest/index.ts`. The core does not import `@nestjs/*`; an ESLint rule (WP-03) checks it: outside `src/nest/` neither `@nestjs/*` nor another `/nest` sub-entry is imported. `domain/` already had that rule for the domain.

**Convention.** `ConfigurableModuleBuilder` from `@nestjs/common` is used, which generates `forRoot` and `forRootAsync` without custom code. `forFeature` is written by hand when the service registers something of its own.

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

**Who picks the adapter.** A core module never imports an adapter (the dependency would go the wrong way). The option receives the adapter type and the module binds it to the port:

```ts
export interface CacheModuleOptions {
  /** `InMemoryCache` by default, the local mode without Valkey. */
  readonly store?: Type<CachePort>;
}
// in CacheModule: { provide: CachePort, useExisting: options.store ?? InMemoryCache }
```

The same goes for `RateLimitModule` (`limiter`, `degradeLocally`), `ShardingModule` (`routingCache`, `channel`, `directory`), `MessagingModule` (`outboxStore`, `processedStore`, `bus`, `publisher`), `InternalApiModule` (`processedStore`) and `SagaModule` (`store`). The adapter exports its classes from its module and the app names them. Without Valkey, the service does not pass `store` and gets the local mode.

**Configuration.** `ConfigModule.forRoot({ schema })` receives only the service's own schema. Each library module imports `ConfigModule.forFeature(section)` with its section (`LoggingConfig`, `TelemetryConfig`, `DatabaseConfig`, `ValkeyConfig`, `AwsConfig`), so the service does not write `.extend(...)` or know other modules' variables (CFG-1). Everything is validated at startup and fails listing all the errors.

```ts
export class ConfigSection<T> {
  constructor(
    readonly name: string,
    readonly schema: z.ZodType<T>,
  ) {}
}
export abstract class AppConfig {
  abstract get<T>(section: ConfigSection<T>): T;
}
```

**Lifecycle.** Nest 12 first calls every `onModuleDestroy`, then `beforeApplicationShutdown` and finally `onApplicationShutdown` (verified in wave 1):

1. `onModuleDestroy` of those that generate work (`JobRunner`, `SqsPoller`, Pub/Sub subscriptions): they stop first because their modules are imported later in `AppModule` (Nest destroys in the reverse order of import).
2. `onModuleDestroy` of the resources (`SNSClient`, `SQSClient`, Valkey client with `quit`, TypeORM `DataSource`), in global modules imported earlier: `ValkeyModule`, `AwsModule` and `PersistenceModule` come before `SchedulingModule` and the consumers. `SqsPoller` lives in `SqsConsumerModule`, which is not global: that way Nest destroys it before the `AwsModule` clients, which only implements `OnModuleDestroy`.
3. `onApplicationShutdown`: telemetry is flushed.

**Health.** `HealthRegistry` lives in observability (`register(check: HealthCheckable)`, `checkAll()`). Each network adapter registers itself in its `onModuleInit`. F4 mounts the `/health/live` and `/health/ready` endpoints in `@platform/http` on top of `HealthRegistry`.

| Library           | Module                   | Provides (token)                                                                                                                                                               | Hooks                                                 |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| config            | `ConfigModule`           | `AppConfig`                                                                                                                                                                    | none                                                  |
| observability     | `ObservabilityModule`    | `LoggerPort`, `MetricsPort`, `RequestContextStore`, `Tracing`, `Redactor`, `HealthRegistry`, `TELEMETRY`                                                                       | `OnApplicationShutdown` (telemetry flush)             |
| resilience        | `ResilienceModule`       | `ResilienceRegistry`; `forFeature({ name, policy })` adds a policy                                                                                                             | none                                                  |
| cache             | `CacheModule`            | `CachePort`, `SingleFlight`, `CacheAside` per namespace (`cacheAsideToken(namespace)`)                                                                                         | none                                                  |
| rate-limit        | `RateLimitModule`        | `RateLimiter`, `RateLimitGuard`                                                                                                                                                | none                                                  |
| bloom             | `BloomModule`            | `bloomFilterToken(name)` through `forFeature`, `BloomRebuildJob`                                                                                                               | none                                                  |
| scheduling        | `SchedulingModule`       | `JobRunner`, `JobLock`                                                                                                                                                         | `OnApplicationBootstrap`, `BeforeApplicationShutdown` |
| sharding          | `ShardingModule`         | `ShardRouter`, `DirectoryChangeSubscription`                                                                                                                                   | `OnModuleInit`, `OnModuleDestroy`                     |
| messaging         | `MessagingModule`        | `OutboxWriter`, `MessageBus`, `MessageDispatcher`, `OutboxRelay`, `MessagingExplorer`, jobs                                                                                    | `OnApplicationBootstrap` (consumer registration)      |
| internal-api      | `InternalApiModule`      | `InternalClient`, `InternalRouter`, `Transport`, `InternalApiController`, jobs                                                                                                 | `OnApplicationBootstrap` (`assertComplete`)           |
| persistence       | `PersistenceModule`      | `TransactionManager`, `EntityManagerProvider`, `ShardResolver`, `ShardScope`, `AcrossShards`                                                                                   | `OnModuleDestroy` (closes the `DataSource`s)          |
| adapters-postgres | `PostgresPlatformModule` | `TypeOrmOutboxStore`, `TypeOrmProcessedMessageStore`, `TypeOrmIdempotencyStore`, `TypeOrmDirectoryStore`                                                                       | none                                                  |
| saga              | `SagaModule`             | `Sagas`, `SagaEngine`, `SagaRecoveryJob`, `SagaRetentionJob`; `forFeature([definitions])`                                                                                      | none                                                  |
| adapters-aws      | `AwsModule`              | `SNS_CLIENT`, `SQS_CLIENT`, `SnsSqsMessageBus`, `SnsSqsEnvelopePublisher`, `AwsMessagingNames`, `AwsErrorTranslator`                                                           | `OnModuleDestroy`                                     |
| adapters-aws      | `SqsConsumerModule`      | `SqsPoller`, `SqsDeliveryProcessor`, `SqsDeadLetterRedriver`; not global                                                                                                       | `OnApplicationBootstrap`, `OnModuleDestroy`           |
| adapters-valkey   | `ValkeyModule`           | `VALKEY_CLIENT`, `ValkeyCache`, `ValkeyRateLimiter`, `ValkeyRoutingCache`, `ValkeyShardDirectoryChannel`, `ValkeyBloomFilterFactory`, `ValkeyJobLock`, `ValkeyHealthIndicator` | `OnModuleDestroy` (`quit`)                            |

Telemetry starts early, outside Nest (correction of OBS-3):

```ts
// instrumentation.ts, first import of main.ts
import { TelemetryBootstrap } from '@platform/observability/setup';
export const telemetry = TelemetryBootstrap.start(process.env);

// ObservabilityModule provides { provide: TELEMETRY, useValue: telemetry } and, on shutdown, calls shutdown().
```

### D4. Who schedules the jobs: `ScheduledJob` and a runner

Today there are four pieces with a `runOnce` or `purge` method and no scheduler: the outbox relay, idempotency and outbox purging, `SagaRecoveryJob` and the Bloom rebuild. F4 proposes a provisional `IntervalJob` and an `OutboxRelayWorker`. They are replaced by a single mechanism.

**The contract lives in the kernel** (`kernel/src/ports/scheduling/`), so each library declares its jobs without depending on the runner or on NestJS:

```ts
export enum JobScheduleKind {
  Interval = 'interval',
  Cron = 'cron',
}
export type JobSchedule =
  | {
      readonly kind: JobScheduleKind.Interval;
      readonly everyMs: number;
      readonly jitterRatio?: number;
    }
  | { readonly kind: JobScheduleKind.Cron; readonly expression: string }; // UTC, 5 or 6 fields

export interface JobContext {
  readonly signal: AbortSignal;
  readonly startedAt: Date;
  readonly runId: string;
}

export abstract class ScheduledJob {
  /** Value of an enum from the owning library, for example `MessagingJob.OutboxRelay`. */
  abstract readonly name: string;
  abstract readonly schedule: JobSchedule;
  /** true: a single process in the cluster runs it at a time, with `JobLock`. */
  readonly exclusive: boolean = false;
  readonly timeoutMs: number = 60_000;
  abstract run(context: JobContext): Promise<void>;
}

export abstract class JobLock {
  abstract tryAcquire(
    name: string,
    ttlMs: number,
  ): Promise<JobLease | undefined>;
  abstract release(lease: JobLease): Promise<void>;
}
export interface JobLease {
  readonly name: string;
  readonly token: string;
}
```

**The runner lives in `@platform/scheduling`** (new library, `type:platform`, depends on kernel, primitives and observability):

```ts
export class JobRunner {
  constructor(
    clock: Clock,
    random: RandomSource,
    lock: JobLock,
    logger: LoggerPort,
    metrics: MetricsPort,
  );
  register(job: ScheduledJob): void;
  start(): void;
  /** Waits for running jobs up to `graceMs` and aborts their `signal`. */
  stop(graceMs: number): Promise<void>;
  /** Runs once right now. Used by tests, wake-ups and external invocation. */
  runNow(name: string): Promise<void>;
  /** Requests a run soon, without duplicating one in progress. */
  trigger(name: string): void;
}

export class CronExpression {
  static parse(expression: string): CronExpression;
  nextAfter(from: Date): Date;
}

export class InProcessJobLock extends JobLock {} // local mode and tests
export enum SchedulingMode {
  InProcess = 'in-process',
  External = 'external', // no timers: EventBridge or a cron calls runNow
}
```

`SchedulingModule` (in `@platform/scheduling/nest`) discovers the providers that are `instanceof ScheduledJob` with `DiscoveryService`, so a library only declares the class in its `providers` and does not import the scheduling module. The cron is written in-house (about 120 lines, no new dependency). `ValkeyJobLock` (SET NX PX with a token) arrives in WP-11.

**Job assignment.**

| Job                              | Owner        | Schedule                   | Exclusive | Note                                                                                                       |
| -------------------------------- | ------------ | -------------------------- | --------- | ---------------------------------------------------------------------------------------------------------- |
| `OutboxRelayJob`                 | messaging    | every 1 s with jitter      | no        | Uses `SKIP LOCKED`. `OutboxMessageBus.onAppended` calls `runner.trigger`. Walks shards with `RelayScopes`. |
| `OutboxRetentionJob`             | messaging    | every hour                 | no        | Calls `OutboxStore.purge`.                                                                                 |
| `ProcessedMessageRetentionJob`   | messaging    | every hour                 | no        | `PurgeableStore.purgeCompleted`.                                                                           |
| `ProcessedOperationRetentionJob` | internal-api | every hour                 | no        | Same, on `ProcessedOperationStore`.                                                                        |
| `SagaRecoveryJob`                | saga         | every 5 s                  | no        | Resumes through `findRecoverable` with `SKIP LOCKED` and a lease.                                          |
| `SagaRetentionJob`               | saga         | every hour                 | no        | Purges finished sagas after the retention period.                                                          |
| `BloomRebuildJob`                | bloom        | the filter's `rebuildCron` | yes       | Rebuilds with an injected data source.                                                                     |

To walk shards without messaging knowing about TypeORM:

```ts
// @platform/messaging
export abstract class RelayScopes {
  /** Runs `body` once for each partition that has to be published from. */
  abstract forEach(body: () => Promise<void>): Promise<void>;
}
export class SingleRelayScope extends RelayScopes {} // default, a single database
// @platform/adapters-postgres: ShardedRelayScopes uses AcrossShards and ShardScope from persistence.
```

### D5. Consumers and handlers as classes

`@Subscribe` and `@InternalHandler` are decorators that describe metadata (like the `define*` factories, they are declarative). An explorer discovers them and registers them in the dispatcher or the router, whose `register` API is kept for uses without Nest.

```ts
@Injectable()
export class WelcomeEmailConsumer {
  constructor(private readonly sendWelcome: SendWelcomeEmail) {}

  @Subscribe(UserRegisteredV1)
  async onUserRegistered(
    data: UserRegisteredV1Data,
    envelope: MessageEnvelope<UserRegisteredV1Data>,
  ): Promise<void> {
    await this.sendWelcome.execute({
      userId: data.userId,
      tenantId: envelope.tenantId,
    });
  }
}

@Injectable()
export class CreateTenantHandler {
  @InternalHandler(CreateTenantOperation)
  handle(
    input: CreateTenantInput,
    call: CallContext,
  ): Promise<CreateTenantOutput> {
    /* ... */
  }
}

export class MessagingExplorer implements OnApplicationBootstrap {
  constructor(
    discovery: DiscoveryService,
    scanner: MetadataScanner,
    dispatcher: MessageDispatcher,
  );
  onApplicationBootstrap(): void;
}
```

`TenantVerifier` goes from a function type to an abstract class with a default implementation:

```ts
export abstract class TenantVerifier {
  abstract verify(
    tenantId: string | undefined,
    envelope: MessageEnvelope,
  ): Promise<boolean>;
}
export class AcceptAnyTenantVerifier extends TenantVerifier {}
```

`InternalApiModule` calls `router.assertComplete(registry)` in `onApplicationBootstrap`, so a service with an operation without a handler does not start.

### D6. `internal-api` HTTP transport

The whole piece lives in `@platform/internal-api` (INT-1), and F4 consumes it instead of rewriting it (F4 3.4.3). What is specific to service-to-service authentication is a port.

```ts
// @platform/internal-api (core, without Nest)
export class HttpTransport extends Transport {
  constructor(
    baseUrls: ServiceBaseUrls,
    signer: InternalCallSigner,
    resilience: ResilienceRegistry,
    fetcher: typeof fetch,
  );
  invoke(operationId: string, input: unknown, meta: CallMeta): Promise<CallOutcome<unknown>>;
}

export abstract class InternalCallSigner {
  abstract sign(request: SignableRequest): Promise<Record<string, string>>;
}
export abstract class InternalCallAuthenticator {
  abstract authenticate(request: SignableRequest): Promise<void>; // throws if not valid
}
export class HmacSigner extends InternalCallSigner {}
export class HmacInternalCallAuthenticator extends InternalCallAuthenticator {} // 60 s window

// @platform/internal-api/nest
@Controller('internal/operations')
export class InternalApiController {
  constructor(router: InternalRouter, authenticator: InternalCallAuthenticator);
  @Post(':operationId')
  handle(/* body, headers */): Promise<InternalResponse>;
}
```

- The client validates the request against the contract before calling (`CLAUDE.md` rule), propagates `traceparent`, tenant, actor and idempotency key in headers, and retries with the `ExternalApi` policy from the `ResilienceRegistry`.
- The controller does not go through F4's `EndpointGuard`. `InternalApiModule.forRoot({ transport: InternalTransportKind.Http | InProcess })`.
- The AWS SigV4 signer is deferred to F12 (it is just another `InternalCallSigner`).

### D7. Splitting the large classes

Each resulting class stays under 200 lines and has its own constructor. The existing public API does not change, so its consumers do not break.

```ts
// sharding (SHD-1)
export class ShardRouter {
  constructor(deps: ShardRouterDeps);
  resolve(context: ShardContext): Promise<Placement>;
  assertWritable(placement: Placement): void;
  invalidate(tenantId: string): Promise<void>;
  applyDirectoryChange(change: DirectoryChange): Promise<void>;
}
export class PlacementCache {} // local LRU plus shared RoutingCache, with tombstones and minimum version
export class InvalidationLog {} // sequence and invalidation table
export class PlacementLoader {} // shared in-flight load; uses Deadline
export class DirectoryChangeApplier {} // applies changes from the channel
export class PlacementCodec {} // replaces encodePlacement and decodePlacement
export class ShardingFeature {} // immutable: validate() and keyFor(context)

// messaging (MSG-3)
export class EnvelopeValidator {
  validate(raw: unknown): ValidatedEnvelope;
}
export class ClaimGuard {
  constructor(store: ProcessedMessageStore, clock: Clock, guard: Guard);
  claim(envelope: MessageEnvelope, consumer: string, options: DispatchOptions): Promise<ClaimOutcome>;
  complete(claim: AcquiredMessageClaim): Promise<void>;
  release(claim: AcquiredMessageClaim): Promise<void>;
}
export class DeliveryClassifier {
  classify(error: unknown, options: DispatchOptions): DispatchResult;
}
export class MessageDispatcher {
  register<T>(contract: MessageContract<T>, handler: MessageHandler<T>): void;
  dispatch(raw: unknown, options: DispatchOptions): Promise<DispatchResult>;
}

// internal-api (INT-3)
export class OperationDispatcher {} // validation and routing
export class IdempotencyGate {} // claim, complete and release with ProcessedOperationStore
export class UnitOfWorkRunner {
  /** Commits or rolls back according to `outcome.commit`. There is no sentinel exception. */
  run<T>(work: (uow: UnitOfWork) => Promise<HandlerOutcome<T>>): Promise<HandlerOutcome<T>>;
}
export class InternalRouter {
  register(operation: OperationDescriptor, handler: OperationHandler): void;
  assertComplete(registry: ContractRegistry): void;
  handle(call: IncomingCall): Promise<CallOutcome<unknown>>;
}

// resilience (RES-1, RES-2)
export class PolicyName {
  static readonly Cache = new PolicyName('cache');
  static readonly Database = new PolicyName('database');
  static of(value: string): PolicyName; // the service's own policies
  private constructor(readonly value: string);
}
export class PolicyRegistry {} // resolution and entries
export class PolicyExecutor {} // attempts, per-attempt timeout and retry
export class ResilienceEventBus {} // listeners
export class ResilienceRegistry {
  execute<T>(name: PolicyName, operation: (signal: AbortSignal) => Promise<T>, options?: ExecuteOptions): Promise<T>;
  subscribe(listener: ResilienceEventListener): () => void;
}

// adapters-aws (AWS-2)
export class SqsDeliveryProcessor {} // shared logic: validates, dispatches, decides to delete or retry
export class SqsPoller {} // service mode: long polling, start() and stop()
export class SqsLambdaHandler {} // Lambda mode: handleEvent(event)
export class SqsDeadLetterRedriver {} // forwarding to the DLQ
export class SqsConsumerConfig {} // batch, wait and visibility with default values
```

`Ai`, `AiStreaming` and `Email` are deleted from the policies (nobody uses them). `ResilienceModule` brings `Cache` and `Database`; the rest are registered with `forFeature`. No `@Resilient` decorator is added: `registry.execute` is the only way and the skill says so.

### D8. Duplication

It is removed in this phase, each piece in its owner's wave.

| Duplicate                                                                    | Resolution                                                                                | Wave    |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------- |
| Four deadline waits (`raceDeadline`, `wait.ts`, `LookupBudget`, SQS `sleep`) | `Deadline`                                                                                | 0, 1, 3 |
| Four retry models and two `DEFAULT_RETRY_POLICY`                             | `RetryPolicy` from primitives; internal-api and messaging reuse it; resilience accepts it | 0, 1, 2 |
| `InternalClient`'s own retry loop                                            | `ResilienceRegistry` with the `ExternalApi` policy                                        | 2       |
| Two code enums per library                                                   | One enum per library (D2)                                                                 | 1 to 3  |
| Repeated `abstract readonly failureKind`                                     | `PlatformError` computes it                                                               | 0       |
| Twelve `assert*` functions and `isPlainObject`                               | `Guard` and `CanonicalJson`                                                               | 0 to 3  |
| `describeError`, `codeOf`, `reasonOf`                                        | `ErrorDescriptor`                                                                         | 0 to 3  |
| `MAX_TENANT_ID_LENGTH` with 64 and 128                                       | `TenantId.MAX_LENGTH`                                                                     | 0, 1, 2 |
| `MESSAGING_RESOURCE_NAME` and `MESSAGING_NAME_PATTERN`                       | The one in contracts                                                                      | 2       |
| Repeated `ERROR_CODE_PATTERN`                                                | Two expressions with a consistency test (D2)                                              | 0       |
| `IsolationLevel` in primitives and in persistence                            | The kernel's                                                                              | 0, 2    |
| cache's `stable-hash.ts`                                                     | `CanonicalJson.digest`                                                                    | 1       |
| saga's `inTrace` and internal-api's `traceContext`                           | `TraceContextRestorer` in observability                                                   | 1, 2, 3 |
| Four Docker detections                                                       | `ContainerRuntime`                                                                        | 0, 3    |
| Obsolete messaging options                                                   | `LegacyBackoffOptions`, `newId` and `now` are deleted                                     | 2       |
| bloom's and aws's `partitionOf` with different meanings                      | The aws one becomes a private method of `AwsMessagingNames`                               | 1, 3    |
| `toDate` and `toMs` repeated in the Postgres stores                          | A TypeORM `TimestampTransformer`                                                          | 3       |

### D9. Test doubles out of the public index

Doubles move to `src/__tests__/utils/` and are exported through `@platform/<lib>/test-utils` (WP-01 creates the alias). Each double passes the same contract test as the real adapter: `run<Port>Contract(factory)`, also in `test-utils`.

| Double                                                                | From          | To                                   | Contract                                                     |
| --------------------------------------------------------------------- | ------------- | ------------------------------------ | ------------------------------------------------------------ |
| `InMemoryIdempotencyStore`                                            | primitives    | `@platform/kernel/test-utils`        | `runIdempotencyStoreContract`                                |
| `InMemoryBus`, `InMemoryOutboxStore`, `InMemoryProcessedMessageStore` | messaging     | `@platform/messaging/test-utils`     | `runOutboxStoreContract`, `runProcessedMessageStoreContract` |
| `InMemoryProcessedOperationStore`                                     | internal-api  | `@platform/internal-api/test-utils`  | `runIdempotencyStoreContract`                                |
| `InMemorySagaStore`                                                   | saga          | `@platform/saga/test-utils`          | `runSagaStoreContract`                                       |
| `InMemoryDirectoryStore`                                              | sharding      | `@platform/sharding/test-utils`      | `runDirectoryStoreContract`                                  |
| `InMemoryRoutingCache`                                                | sharding      | `@platform/sharding/test-utils`      | `runRoutingCacheContract`                                    |
| `InMemoryMetrics`                                                     | observability | `@platform/observability/test-utils` | none                                                         |
| `FakeSqsClient`, `FakeSnsClient` (new)                                | aws           | `@platform/adapters-aws/test-utils`  | none                                                         |

These stay in production, because they are an execution mode and not a double: `InMemoryCache` (the only mode without Valkey), `InMemoryRateLimiter` (used by `DegradingRateLimiter`), `NoopMetrics`, `InProcessJobLock`, and two new sharding pieces, `NullRoutingCache` (reads always fail) and `InProcessDirectoryChannel` (the current in-memory channel, renamed, for a single instance).

The contract tests for `CachePort`, `RateLimiter` (memory versus Valkey, including the Lua script versus `SlidingWindow`), `DirectoryStore`, `RoutingCache` and `SagaStore` are missing. The package that owns each port writes it and runs it against the fake and against the real adapter.

### D10. Tests that verify internal details

Rules for the packages that touch those tests:

- The external result is verified, not the number or order of internal calls. `jest.fn` with `toHaveBeenCalledTimes` is replaced by a fake with behavior and a public counter when the count is a requirement (`PlacementLoader`'s load deduplication, for example).
- The specific findings: `shard-router.spec.ts` (56 `jest.fn`), `cache-aside.spec.ts` (54), `internal-api/router.spec.ts` (38) and `client.spec.ts` (17).
- No logic in tests: tables go with `it.each`; the aws `if (name === 'GetQueueUrlCommand')` ladders are replaced by `FakeSqsClient` and `FakeSnsClient`.
- Each test file corresponds to one class (`saga-engine.spec.ts` with 1,670 lines, `shard-router.spec.ts` with 1,339, `router.spec.ts` with 909 and `define.spec.ts` with 795 are split along with the class they test).
- Integration tests are named `*.int-spec.ts` and use `ContainerRuntime`. `pg-mem` is deleted: the TypeORM layer is tested with Testcontainers.
- Tests for a utility go in the `__tests__` that contains it, without nesting `utils/__tests__` (T9).

### D11. Persistence with TypeORM and sagas: package boundary

The approved design is not touched. It is integrated like this:

- WP-09 is the design's P1: the full `@platform/persistence`, the `ShardScope` with `requireScope` and the `CROSS_SHARD_TX` error that F4 3.6 asks for, the `TypeOrmCriteriaTranslator` (consumes the `criteria` AST, which does not change), an `IdTransformer` and a test harness with two shards on real Postgres in `@platform/persistence/test-utils`. The old code on top of `pg` moves unchanged to `persistence/src/legacy/` and is re-exported until WP-10, so `adapters-postgres` keeps compiling between waves.
- WP-10 is P2: TypeORM entities, migrations and stores for outbox, processed messages, idempotency and directory; it deletes `legacy/` and `pg-mem`. `CriteriaTranslator` stays in persistence and `criteria` only loses `sql.ts` and `postgres.ts` and gains `CursorCodec`.
- WP-12 is P3: the saga engine, `SagaModule`, `TypeOrmSagaStore` and its entities. It lives in `adapters/postgres/src/saga/`, a folder exclusive to WP-12, and exports `platformSagaShardEntities` and `platformSagaShardMigrations`, which the app adds to the WP-10 arrays. That way they do not share a composition file. Each package uses its own range of migration timestamps.
- At the close, WP-13 updates ADRs 0008 and 0009, `ARCHITECTURE.md` and the `backend-persistence-typeorm` skill, as the design asks.

### D12. Remaining library decisions

Summary of what does not need its own signature, with its owner:

- Config (WP-04): schemas by topic, `ConfigLoader` as a class, `LogLevel` moves to observability, `Secret` with a private `#value` field, a typed `match` in `env.ts` without `as unknown as`.
- Observability (WP-04): injectable `RequestContextStore` (the `AsyncLocalStorage` stays private), `Tracing`, `Redactor`, `StructuredLogger` with `LogSink` (`StdoutLogSink`, `OtlpLogSink`), `TelemetryBootstrap`, `TraceContextCodec`, `TraceContextRestorer`, `HealthRegistry`. The resilience and cache listeners are removed from `metrics.ts`.
- Resilience and cache (WP-05): `ResilienceMetricsListener` in resilience and `CacheMetrics` with a `CacheErrorReporter` in cache. `CacheAside` uses the injected `TransactionManager` (`afterCommit`), not a callback. `random`, `singleFlight` and `maxValueBytes` are deleted from its public options.
- Rate-limit (WP-05): immutable `RateLimitRule` with `validate()`, `SlidingWindow` as a shared class with the equivalence test against the Lua script, `RateLimitGuard`.
- Bloom (WP-05): `BloomMath` and `BloomSizing` (static and pure), errors with the `Error` suffix, `BloomModule.forFeature`.
- Sharding (WP-06): `ShardingModule` connects channel, router and directory, and the subscription lives in `DirectoryChangeSubscription`. Obsolete comments fixed (SHD-4).
- AWS and Valkey adapters (WP-11): `AwsModule`, `ValkeyModule`, `ValkeyClientFactory`, `ValkeyCommandExecutor`, `ValkeyKeyspace` with `VALKEY_KEY_PREFIX` equal to `SERVICE_NAME` by default, `AwsErrorTranslator` (a `FailureClassifier` rule), `ElastiCacheIamAuthTokenProvider`.
- Contracts (WP-02): `ServiceContractValidator`, `ProblemDetailsFactory`, `QueryParamsCodec`. These stay functions, by decision: `defineEvent`, `defineCommand`, `defineOperation`, `defineRoute`, `defineTopic`, `defineQueue`, `defineServiceContract`, `defineErrorCatalog` and the zod schemas in `env.ts` and `secret()`.
- Tools (WP-02): `ContractExporter`, `SchemaExportBuilder`, `AsyncApiBuilder`, `TopologyBuilder`, `ExportCommand` with `CheckMode` and `WriteMode`, `ContractsDiscovery` (reads `libs/contracts/*/src/index.ts` and removes the manual registration), `ArtifactWriter`.
- Language and names (T8): in English, translated whole when each file is touched; `util.ts`, `types.ts`, `limits.ts` and `model.ts` are renamed with a role suffix; one public class per file.

## 3. Waves and work packages

### 3.1 Common rules

**How a squad works.** As the [plan](README.md#how-a-wave-runs) says. In the backend, the skeletons are abstract classes and signatures with a `throw new NotImplementedError()` body.

**Shared files.** `backend/tsconfig.base.json`, `backend/package.json` (with `pnpm-lock.yaml`) and the `@contracts/platform` error catalog are touched by a single squad per wave:

| Wave   | Who touches the three files | What it does                                                                                                                              |
| ------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | WP-01                       | Declares every alias in the plan (`@platform/<lib>/nest`, `@platform/<lib>/test-utils`, `@platform/scheduling`) and every new dependency. |
| 1 to 3 | nobody                      | Each library creates the file its alias points to. Declaring the alias before the file breaks nothing until someone imports it.           |
| 4      | WP-13                       | Deletes the internal codes from the central catalog and removes the compatibility re-exports. F4-WP1 and F4-WP4 do not touch them.        |

New WP-01 dependencies, with an exact version like the rest of `package.json` (the guide pins each one with `pnpm view`): `@nestjs/common`, `@nestjs/core`, `@nestjs/testing`, `reflect-metadata`, `rxjs` and `typeorm`. `pg` is already there. `@nestjs/schedule` is not added: the cron is our own.

**Standard closing criteria (SCC).** Every package meets them, in addition to its own criteria. `<projects>` is the list of the package's Nx projects.

1. `pnpm nx run-many -t lint test typecheck --projects=<projects>` green.
2. `pnpm nx run-many -t test --projects=<projects> --coverage` meets 80 for lines, 80 for statements, 80 for functions and 75 for branches.
3. `INTEGRATION_TESTS=require pnpm nx run-many -t test --projects=<projects>` green where the package has `.int-spec.ts` tests.
4. `node .claude/skills/backend-structure/scripts/check-structure.mjs --changed .` with no violations.
5. Public `index.ts` files do not export test doubles or `InMemory*` classes that D9 sends to `test-utils`.
6. JSDoc and docs in English, one public class per file, names with a role suffix.
7. The guide leaves a half-page integration note in the PR: new interfaces, breaking changes and what the consumer must change.

Nx project names: `platform-<lib>` (`platform-kernel`, `platform-primitives`, `platform-config`, `platform-observability`, `platform-resilience`, `platform-cache`, `platform-rate-limit`, `platform-bloom`, `platform-sharding`, `platform-messaging`, `platform-internal-api`, `platform-persistence`, `platform-criteria`, `platform-saga`), `platform-adapters-aws`, `platform-adapters-postgres`, `platform-adapters-valkey`, `contracts-platform`, `contracts-identity`, `contracts-export`, `shared-utils` and the new `platform-scheduling`.

### 3.2 Wave 0: foundations

#### WP-01. Kernel, primitives and shared file foundations (L)

- **Exclusive folders:** `backend/libs/platform/kernel/**`, `backend/libs/platform/primitives/**`, `backend/libs/platform/scheduling/**` (only the project skeleton: `project.json`, jest, tsconfig, empty `src/index.ts`), `backend/libs/shared/utils/**` (removed), `backend/libs/contracts/platform/src/{enums,errors}/**` (only what D2 requires), `backend/libs/contracts/platform/src/kit/error-catalog.ts`, `backend/libs/contracts/platform/src/kit/define-route.ts`, `backend/tsconfig.base.json`, `backend/package.json`, `pnpm-lock.yaml`, `backend/jest.preset.js`.
- **Closes:** KRN-1, KRN-2, KRN-3, KRN-4, PRM-1, PRM-2, PRM-3, T4, T6, T7, UTL-1, SHD-5 (the `TenantId`), T3 (the primitives part: `Deadline`, `RetryPolicy`, `Backoff`), T2 and CTR-1 (only the mechanism), CTR-3 (the code pattern), T9 (the kernel part).
- **Consumes:** nothing new.
- **Produces:** `RandomSource`, `Guard`, `ErrorDescriptor`, `PlatformError` with `failureKind`, `ErrorCode`, `KernelErrorCode`, transaction and idempotency ports and `ScheduledJob` and `JobLock` in `kernel/src/ports/`, `PurgeableStore`, `HealthCheckable`, `TenantId`, `Money`, `ContainerRuntime`, and in primitives `RetryPolicy`, `Backoff`, `Deadline`, `FailureClassifier`, `RetryAfterParser`, `CanonicalJson`, `Hashes`. `@deprecated` re-exports of the ports in primitives.
- **Specific acceptance:**
  - `grep -rn "@contracts" backend/libs/platform/kernel/src` returns nothing.
  - The code pattern consistency test walks `platformErrorCatalog` and `kernelErrorCatalog`.
  - `Clock`, `IdGenerator`, `TransactionManager` and `IdempotencyStore` still accept an object literal as a double: the guide verifies it with `pnpm nx run-many -t typecheck` over **all** projects, without changes to them.
  - `pnpm nx run-many -t test --projects=platform-kernel,platform-primitives,contracts-platform` with coverage and `INTEGRATION_TESTS=skip` green; `ContainerRuntime` has unit tests with a simulated `env`.
  - `pnpm install --frozen-lockfile` green and `pnpm nx show projects` lists `platform-scheduling`.
- **Split:** Haiku 1 does the kernel (`RandomSource`, `Clock`, `IdGenerator`, `Guard`, `ErrorDescriptor`, `PlatformError`, `ErrorCode`, `HealthCheckable`, `TenantId`, `Money`, `ContainerRuntime`) and deletes `result.ts` and `shared/utils`. Haiku 2 does primitives (`RetryPolicy`, `Backoff`, `Deadline`, `FailureClassifier`, `RetryAfterParser`, `CanonicalJson`, `Hashes`), moves the ports to `kernel/src/ports/` with the re-exports, and edits the shared files (aliases, dependencies, `jest.preset.js`). The guide writes `ScheduledJob`, `JobLock`, the scheduling skeleton and the catalog mechanism.

#### WP-02. Contracts kit and export tools (M)

- **Exclusive folders:** `backend/libs/contracts/platform/src/{kit,schemas,constants,types}/**` except `kit/error-catalog.ts` and `kit/define-route.ts`, `backend/libs/contracts/platform/src/{contract.ts,index.ts}`, `backend/libs/contracts/identity/**`, `backend/tools/contracts-export/**`.
- **Closes:** CTR-2, CTR-5, TLS-1, TLS-2 (CTR-4 is dismissed; the F11 app and module generator stays out).
- **Consumes:** nothing from WP-01. It does not touch the catalog file or the code pattern.
- **Produces:** `ServiceContractValidator`, `ProblemDetailsFactory`, `QueryParamsCodec`, `ContractExporter` and its collaborators, `ContractsDiscovery`.
- **Specific acceptance:**
  - `pnpm nx run contracts-export:check` (or the equivalent target the guide sets) produces no differences: the shape of the contracts does not change, so the Dart in `front/packages/contracts` does not need to be regenerated.
  - `backend/tools/contracts-export/src/registry.ts` disappears and adding a folder in `libs/contracts/` is enough for it to be exported.
  - `contracts/identity/src/__tests__/contract.spec.ts` and `platform-error-catalog.spec.ts` use `it.each` instead of loops with `if`.
  - `check-structure.mjs` no longer lists the `kit/define-*` files: they are in the exception list that WP-03 sets.
  - SCC with `contracts-platform,contracts-identity,contracts-export`.
- **Split:** Haiku 1: `ServiceContractValidator`, `ProblemDetailsFactory`, `QueryParamsCodec` and their tests. Haiku 2: the `contracts-export` classes, `ContractsDiscovery` and the `contracts/identity` test.

#### WP-03. Skills, ADRs and lint rules (S)

- **Exclusive folders:** `.claude/skills/backend-*/**`, `docs/adr/**`, `docs/ARCHITECTURE.md`, `CLAUDE.md`, `backend/eslint.config.mjs`.
- **Closes:** MSG-6 (the skill is adjusted to the code), T8 (language rule), the D3 lint rule and the `check-structure.mjs` exceptions.
- **Produces:**
  - ADR 0024 on persistence with TypeORM, which supersedes 0009 (0009 is marked as superseded and 0008 is updated). It was already recorded in `b182447`, after the squad set off; see the open decisions in the [plan](README.md#decision-log).
  - ADR 0025 on the NestJS layer through the `@platform/<lib>/nest` sub-entry and ports as abstract classes.
  - ADR 0026 on `ScheduledJob`, `JobLock` and `@platform/scheduling`.
  - The `backend-messaging-idempotency` skill moves from `OutboxWriter.add` and `processed.tryRegister` to `append` and `claim`, `complete` and `release`; the composition skill documents modules, `Type<Port>` and shutdown; the testing skill documents `test-utils` and `ContainerRuntime`.
  - ESLint rule: outside `src/nest/`, neither `@nestjs/*` nor `/nest` sub-entries are imported.
  - `check-structure.mjs` with a declared exception list (contracts `define*` factories, `env.ts` schemas, `tools` `main()`) and that rejects `*.integration.spec.ts`.
  - `CLAUDE.md` without the text that contradicts the decisions (the `ADR 0009` and "loose functions").
- **Specific acceptance:**
  - The script fails on a `*.integration.spec.ts` test file and on a `@nestjs/*` in the core (script tests included).
  - The skills' code examples compile against the signatures in section 2 (the guide extracts them to a temporary file and runs `tsc`).
  - `pnpm nx format-check` green.
- **Split:** Haiku 1: ADRs 0024 to 0026 with the `0000-template.md` template and `CLAUDE.md`. Haiku 2: the skills and the ESLint rule with its test. The guide writes the `check-structure.mjs` change.

**Wave 0 close:** the general runs `pnpm nx run-many -t lint test typecheck` over the whole backend and `check-structure.mjs --all .`. The count of 97 must go down only for what WP-01 and WP-02 resolve.

### 3.3 Wave 1: platform core

The three squads start from the integrated wave 0 and do not share folders. Each library's jobs are tested by calling `run()` directly, because the runner arrives in this same wave.

#### WP-04. Config and observability (L)

- **Exclusive folders:** `backend/libs/platform/config/**`, `backend/libs/platform/observability/**`.
- **Closes:** CFG-1, CFG-2, CFG-3, CFG-4 (CFG-5 stays out), OBS-1, OBS-2, OBS-3, OBS-4, OBS-5, T1 (config and observability), T2 and T4 (in their libs), T5 (`InMemoryMetrics`), T7 and T8.
- **Consumes:** `RandomSource`, `Clock`, `Guard`, `ErrorDescriptor`, `HealthCheckable`, `ConfigSection`.
- **Produces:** `ConfigModule`, `AppConfig`, `ConfigSection`, the `LoggingConfig` and `TelemetryConfig` sections, `ObservabilityModule`, `RequestContextStore`, `RequestContextMiddleware` and `RequestContextInterceptor`, `Tracing`, `Redactor`, `StructuredLogger`, `LogSink`, `TelemetryBootstrap` (with `@platform/observability/setup`), `TraceContextCodec`, `TraceContextRestorer`, `HealthRegistry`, `@platform/observability/test-utils`, `ObservabilityErrorCode` and `ConfigErrorCode`, now single.
- **Specific acceptance:**
  - `grep -rn "@platform/config" backend/libs/platform/observability/src` returns nothing.
  - `grep -rnE "process\.env" backend/libs/platform --include=*.ts` only finds `config` and `setup.ts`.
  - Module test with `@nestjs/testing`: a service without a database that imports `ObservabilityModule.forRoot()` does not receive `DB_*` variables.
  - `RequestContextStore` keeps the context across `await` and a `setTimeout` in a test with `Test.createTestingModule`.
  - The logger redacts a sensitive field the same as before (the existing redaction tests pass without changes).
  - `metrics.ts` no longer imports anything from resilience or cache.
  - SCC with `platform-config,platform-observability`.
- **Split:** Haiku 1: all of config, `TelemetryBootstrap`, `metrics.ts` and `HealthRegistry`. Haiku 2: `request-context`, `logger` with sinks, `redaction`, `spans`, `trace` and `propagation`, and the module.

#### WP-05. Resilience, cache, rate-limit and bloom (L)

- **Exclusive folders:** `backend/libs/platform/resilience/**`, `backend/libs/platform/cache/**`, `backend/libs/platform/rate-limit/**`, `backend/libs/platform/bloom/**`.
- **Closes:** RES-1, RES-2, RES-3, RES-4, CAC-1, CAC-2, CAC-3, CAC-4, CAC-5, RTL-1, RTL-2, BLO-1, BLO-2, BLO-3, BLO-4, T1, T2, T3 (`wait.ts`), T4, T7, T8 and the contract test for `CachePort` and `RateLimiter`.
- **Consumes:** `RandomSource`, `Deadline`, `RetryPolicy`, `Guard`, the kernel's `TransactionManager`, `ScheduledJob`, `MetricsPort` (no shape changes).
- **Produces:** `ResilienceModule`, `PolicyName`, `PolicyRegistry`, `PolicyExecutor`, `ResilienceEventBus`, `ResilienceMetricsListener`, `CacheModule`, `CacheAside` with `forFeature`, `SingleFlight`, `TtlJitter`, `CacheErrorReporter`, `RateLimitModule`, `RateLimitGuard`, `@RateLimit(rule)`, `SlidingWindow`, `BloomModule`, `BloomMath`, `BloomSizing`, `BloomRebuildJob`, `runCachePortContract` and `runRateLimiterContract` in `test-utils`.
- **Specific acceptance:**
  - cache's `wait.ts` and `stable-hash.ts` do not exist; `CacheAside` does not receive `random`, `singleFlight` or `maxValueBytes`.
  - An invalidation test inside a transaction checks that the bump happens after commit and does not happen after a rollback, with a fake `TransactionManager`.
  - The equivalence test compares `SlidingWindow` with `InMemoryRateLimiter` over the same sequence (the comparison with the Lua script is added in WP-11).
  - `BloomRebuildJob.run()` rebuilds a filter from a fake data source and is `exclusive`.
  - A test service with `ResilienceModule.forFeature({ name: PolicyName.of('payments'), policy })` runs under that policy without editing the library.
  - SCC with `platform-resilience,platform-cache,platform-rate-limit,platform-bloom`.
- **Split:** Haiku 1: resilience and rate-limit. Haiku 2: cache and bloom. The guide coordinates the `ResilienceRegistry.execute` contract, which cache consumes.

#### WP-06. Scheduling and sharding (L)

- **Exclusive folders:** `backend/libs/platform/scheduling/**` (the implementation), `backend/libs/platform/sharding/**`.
- **Closes:** SHD-1, SHD-2, SHD-3, SHD-4, SHD-5, SHD-6 (the module and the subscription; the TypeORM part belongs to WP-09 and WP-10), T1, T2, T3 (`LookupBudget`), T5 (sharding), T7, T8 and the enabler for MSG-1 and BLO-1.
- **Consumes:** `ScheduledJob`, `JobLock`, `Clock`, `RandomSource`, `Deadline`, `TenantId`, `Guard`.
- **Produces:** `JobRunner`, `CronExpression`, `InProcessJobLock`, `SchedulingModule`, `SchedulingMode`, `ShardingModule`, split `ShardRouter` (D7), `DirectoryChangeSubscription`, `NullRoutingCache`, `InProcessDirectoryChannel`, `@platform/sharding/test-utils` with `runDirectoryStoreContract` and `runRoutingCacheContract`.
- **Specific acceptance:**
  - Each class from the `ShardRouter` split has fewer than 200 lines; `shard-router.ts` stays under 150.
  - The public API of `ShardRouter` does not change: the existing behavior tests pass with the new fakes and without internal `toHaveBeenCalledTimes` (D10).
  - A `PlacementLoader` test shows that a hundred concurrent `resolve` calls for the same tenant read the source only once.
  - `JobRunner`: an `exclusive` job does not run on two runners sharing an `InProcessJobLock`; `stop(graceMs)` waits for the running execution and aborts its `signal` when it expires; `trigger` does not duplicate a run; the `0 3 * * *` cron computes `nextAfter` in UTC with four cases in `it.each`, including the year change.
  - `SchedulingModule` discovers two `ScheduledJob` declared as providers of another module, without importing that module (test with `@nestjs/testing`).
  - `ShardingModule` subscribes to the channel in `onModuleInit` and closes it in `onModuleDestroy`.
  - SCC with `platform-scheduling,platform-sharding`.
- **Split:** Haiku 1: all of `@platform/scheduling`. Haiku 2: the `ShardRouter` split, its classes and `ShardingModule`. The guide writes `JobRunner` and the `ShardRouter` API.

**Wave 1 close:** typecheck of the whole backend, with `ObservabilityModule`, `ResilienceModule`, `SchedulingModule` and `ShardingModule` imported together in a startup test in `platform-scheduling` that does not break because of duplicate tokens.

### 3.4 Wave 2: messaging, internal API and persistence

#### WP-07. Messaging (L)

- **Exclusive folders:** `backend/libs/platform/messaging/**`.
- **Closes:** MSG-1, MSG-2, MSG-3, MSG-5, MSG-7, MSG-8, T1, T2, T3, T5, T7, T8 (MSG-4 deferred, MSG-6 already done in WP-03).
- **Consumes:** `ScheduledJob`, `JobRunner` (through discovery), `RetryPolicy`, `Guard`, `ErrorDescriptor`, `TenantId`, `ResilienceModule` (`Queue` policy registered by the module with `forFeature`), `ObservabilityModule`.
- **Produces:** `MessagingModule`, `@Subscribe`, `MessagingExplorer`, `TenantVerifier`, `EnvelopeFactory`, `EnvelopeParser`, `EnvelopeValidator`, `ClaimGuard`, `DeliveryClassifier`, split `MessageDispatcher`, `OutboxRelayJob`, `OutboxRetentionJob`, `ProcessedMessageRetentionJob`, `RelayScopes`, `SingleRelayScope`, `MessagingJob` (enum), `@platform/messaging/test-utils` with `InMemoryBus`, `InMemoryOutboxStore`, `InMemoryProcessedMessageStore`, `runOutboxStoreContract` and `runProcessedMessageStoreContract`.
- **Specific acceptance:**
  - A test with `@nestjs/testing`: an `@Injectable` with `@Subscribe(UserRegisteredV1)` receives a message sent to the `MessageDispatcher`, without calling `register` by hand.
  - An invalid message goes to the DLQ and is not retried; a `TenantVerifier` that throws is treated as a transient failure (the current dispatcher tests pass, relocated by class).
  - `OutboxRelayJob.run()` publishes a batch against `InMemoryOutboxStore` and a fake publisher; `OutboxMessageBus` wakes the runner with `trigger` and a test shows that an `append` followed by a commit publishes without waiting for the interval.
  - `LegacyBackoffOptions`, `newId`, `now`, `defaultIds`, `defaultClock` and `describe-error.ts` do not exist.
  - `message-dispatcher.ts` stays under 200 lines and there are no more than 4 `jest.fn` with call counts in the messaging tests.
  - SCC with `platform-messaging`.
- **Split:** Haiku 1: `EnvelopeFactory`, `EnvelopeParser`, `EnvelopeValidator`, `ClaimGuard`, `DeliveryClassifier` and relocating the dispatcher tests. Haiku 2: module, explorer, `@Subscribe`, jobs, `RelayScopes` and `test-utils`.

#### WP-08. Internal-api (L)

- **Exclusive folders:** `backend/libs/platform/internal-api/**`.
- **Closes:** INT-1, INT-2, INT-3, INT-4, INT-5, INT-6, INT-7, T1, T2, T3, T5, T7, T8.
- **Consumes:** `ResilienceRegistry` and `PolicyName`, `RetryPolicy`, `Guard`, `TenantId`, `ScheduledJob`, `TraceContextRestorer`, `TransactionManager`, `IdempotencyStore`.
- **Produces:** `HttpTransport`, `InternalCallSigner`, `InternalCallAuthenticator`, `HmacSigner`, `HmacInternalCallAuthenticator`, `InternalApiController`, `InternalApiModule`, `@InternalHandler`, `OperationDispatcher`, `IdempotencyGate`, `UnitOfWorkRunner`, `OperationMetadata` as a class, `IdempotencyKeyPolicy`, `PayloadLimit`, `CallAttempt`, `ProcessedOperationRetentionJob`, `@platform/internal-api/test-utils`. The shape of `InternalClient.call` and `callById` and that of `OperationInvoker` do not change, because WP-12 consumes them.
- **Specific acceptance:**
  - End-to-end test with two `InternalApiModule` in a single Nest process and `HttpTransport` on a real HTTP server: the call arrives, is validated against the contract in the client before leaving, propagates `traceparent`, and is rejected with an invalid signature or outside the 60 s window.
  - `InternalClient` has no retry loop of its own and no `sleep`, `random`, `clock` options; a `transient-failure` is retried by the `ResilienceRegistry` with the `ExternalApi` policy.
  - The `ROLLBACK` symbol does not exist: a handler that returns `commit: false` rolls back the transaction in a test with a fake `TransactionManager`.
  - `router.ts` stays under 150 lines; a module with an operation without a handler does not start.
  - SCC with `platform-internal-api`.
- **Split:** Haiku 1: `HttpTransport`, HMAC signatures, `InternalApiController` and its end-to-end test. Haiku 2: the `InternalRouter` split, `OperationMetadata`, `InternalClient` on top of resilience, and the module.

#### WP-09. Persistence on TypeORM (L)

- **Exclusive folders:** `backend/libs/platform/persistence/**`.
- **Closes:** the persistence part of the approved design (sections 3 and 6 of P1), 2.17 of the report, CRI-1 (the translator), SHD-6 (the directory part), KRN-3 (`IdTransformer`), T1, T6 and the F4 3.6 adjustment (`ShardScope`, `requireScope`, `CROSS_SHARD_TX`).
- **Consumes:** `ShardRouter` and its module (WP-06), `RequestContextStore` (WP-04), the kernel's `TransactionManager` and `IsolationLevel`, `AppConfig`, `ContainerRuntime`, the `criteria` AST.
- **Produces:** `PersistenceModule` (`forRoot`, `forFeature`), `ShardDataSources`, `CatalogDataSource`, `ShardResolver`, `TypeOrmTransactionManager`, `TransactionShardGuard`, `EntityManagerProvider`, `ShardedRepository`, `CatalogRepository`, `ShardScope`, `AcrossShards`, `ShardedMigrationRunner`, `AuditedEntity`, `VersionedEntity`, `PersistenceContextProvider`, `TypeOrmCriteriaTranslator`, `IdTransformer`, `TimestampTransformer`, `DatabaseConfig`, and `@platform/persistence/test-utils` with a `ShardedTestDatabase` harness (two shards on real Postgres). The old code stays in `src/legacy/`.
- **Specific acceptance:**
  - `INTEGRATION_TESTS=require pnpm nx test platform-persistence` with two real shards: an entity of a tenant is saved and read on its shard; a transaction that touches another shard fails with `CROSS_SHARD_TX`; so does a `ShardScope.run` nested to another shard inside a transaction; without a scope and with `requireScope`, `PLATFORM.SHARDING.KEY_MISSING`.
  - The optimistic version throws a conflict on a second write with the old version; soft delete hides the row; an `afterCommit` only runs after commit.
  - `ShardedMigrationRunner` migrates the catalog and both shards with `pg_advisory_lock` and is idempotent when repeated.
  - A `TypeOrmCriteriaTranslator` paginates with a cursor and respects the field allowlist; a field outside it fails (the test uses an injection condition).
  - `synchronize` is `false` in all configuration and a test checks it.
  - The Nx `migration-generate` target generates a migration for a test entity.
  - Nothing outside `legacy/` imports `pg` directly; an ESLint rule forbids new imports into `legacy/`.
  - `@Audited` and the audit trigger are kept with their test.
  - SCC with `platform-persistence`. Note: Jest's SWC configuration must emit decorator metadata for the entities.
- **Split:** Haiku 1: `ShardDataSources`, `CatalogDataSource`, `ShardResolver`, `TypeOrmTransactionManager`, `EntityManagerProvider`, `ShardScope`, `AcrossShards`. Haiku 2: `ShardedRepository`, `CatalogRepository`, base entities, `TypeOrmCriteriaTranslator`, `ShardedMigrationRunner`, migration targets and the test harness. The guide writes `PersistenceModule` and the move to `legacy/`.

**Wave 2 close:** the general checks that `adapters-postgres` still compiles through `legacy/` and that `pnpm nx run-many -t typecheck` passes everywhere.

### 3.5 Wave 3: stores, adapters and sagas

#### WP-10. Platform tables on TypeORM and criteria (L)

- **Exclusive folders:** `backend/libs/platform/adapters/postgres/**` except `src/saga/`, `backend/libs/platform/criteria/**`, `backend/libs/platform/persistence/src/legacy/**` (only to delete it).
- **Closes:** all of 2.16 (stores, migrations, `pg-mem`, inheritance between stores, repeated dates), CRI-1 (removing the SQL), CRI-2, CRI-3, CRI-4, SHD-6 (`TypeOrmDirectoryStore`), T1, T2, T6, T8.
- **Consumes:** the WP-09 core, `runOutboxStoreContract`, `runProcessedMessageStoreContract`, `runIdempotencyStoreContract`, `runDirectoryStoreContract`, `ScheduledJob`, `RelayScopes`.
- **Produces:** `PostgresPlatformModule`, entities (`OutboxEntity`, `IdempotencyKeyEntity`, `ProcessedMessageEntity`, `ShardDirectoryEntity`, `ShardInstanceEntity`, `ShardLockEntity`), migrations generated with the CLI, `TypeOrmOutboxStore`, `TypeOrmProcessedMessageStore`, `TypeOrmIdempotencyStore`, `TypeOrmDirectoryStore`, `ClaimTable<R>` by composition, `ShardedRelayScopes`, `platformShardEntities`, `platformShardMigrations`, `platformCatalogEntities`, `platformCatalogMigrations`, `CursorCodec` and `PageBuilder` in criteria.
- **Specific acceptance:**
  - The four stores pass their contract tests on real Postgres, the same ones as the in-memory fake.
  - `FOR UPDATE SKIP LOCKED` demonstrated: two concurrent relays over the same outbox do not publish the same message twice.
  - The partial indexes (`outbox_open_idx` and the others) exist in the generated migration and the `CHECK` constraints come from the enums.
  - `grep -rn "pg-mem" backend` returns nothing; `persistence/src/legacy/` does not exist; `criteria/src/sql.ts` and `postgres.ts` do not exist.
  - `CursorCodec` is built once with the secret and rejects a tampered cursor.
  - SCC with `platform-adapters-postgres,platform-criteria,platform-persistence`.
- **Split:** Haiku 1: entities, migrations and the outbox and processed-message stores. Haiku 2: the idempotency and directory stores, `ShardedRelayScopes` and criteria.

#### WP-11. AWS and Valkey adapters (L)

- **Exclusive folders:** `backend/libs/platform/adapters/aws/**`, `backend/libs/platform/adapters/valkey/**`.
- **Closes:** AWS-1, AWS-2, AWS-3, AWS-4, VLK-1, VLK-2, VLK-3, T1, T3 (the SQS `sleep`), T5, T6, T8, T9 (the integration part), section 4 of the report for aws and the Valkey contract test (memory versus Valkey for cache and rate-limit).
- **Consumes:** `MessageBus`, `EnvelopePublisher`, `MessageDispatcher` and the messaging ports (WP-07), `CachePort`, `RateLimiter`, `RoutingCache`, `ShardDirectoryChange*`, `BloomFilter`, `JobLock`, `HealthCheckable`, `ResilienceRegistry`, `FailureClassifier`, `ContainerRuntime`.
- **Produces:** `AwsModule`, `SNS_CLIENT`, `SQS_CLIENT`, `AwsMessagingNames`, `AwsErrorTranslator`, `ElastiCacheIamAuthTokenProvider`, `SqsDeliveryProcessor`, `SqsPoller`, `SqsLambdaHandler`, `SqsDeadLetterRedriver`, `SqsConsumerConfig`, `FakeSqsClient`, `FakeSnsClient`, `ValkeyModule`, `ValkeyClientFactory`, `ValkeyCommandExecutor`, `ValkeyKeyspace`, `ValkeyErrorTranslator`, `ValkeyJobLock`, `ValkeyHealthIndicator`, `ValkeyBloomFilterFactory`. The `*.integration.spec.ts` files become `*.int-spec.ts`.
- **Specific acceptance:**
  - `AwsModule` closes both clients in `onModuleDestroy`, and `SqsPoller`, which lives in `SqsConsumerModule`, stops in its `onModuleDestroy`, before the clients (test with `app.close()` and a fake client that counts closes).
  - No `if (name === 'GetQueueUrlCommand')` in tests.
  - `ValkeyModule` calls `quit` on close and registers its `ValkeyHealthIndicator`; `ValkeyJobLock` prevents two instances from taking the same job (integration with real Valkey).
  - The contract test runs `runCachePortContract` and `runRateLimiterContract` against `InMemory*` and against Valkey; the Lua script and `SlidingWindow` give the same result for the same sequence.
  - `@aws-sdk/*` only appears in `adapters/aws`; `valkey` does not depend on `aws`.
  - Without an explicit `VALKEY_KEY_PREFIX`, the prefix is `SERVICE_NAME`.
  - SCC with `platform-adapters-aws,platform-adapters-valkey`.
- **Split:** Haiku 1: all of aws with the fakes. Haiku 2: all of valkey with the contract tests.

#### WP-12. Sagas (L)

- **Exclusive folders:** `backend/libs/platform/saga/**`, `backend/libs/platform/adapters/postgres/src/saga/**`.
- **Closes:** the approved saga design (sections 5 and 5.1), all the notes in 2.12 of the report, T1, T2, T5, T8.
- **Consumes:** `InternalClient` and `OperationInvoker` (WP-08, shape kept), `TypeOrmTransactionManager` and `ShardedTestDatabase` (WP-09), `ScheduledJob`, `RetryPolicy`, `TraceContextRestorer`, `CanonicalJson`, `AcrossShards`.
- **Produces:** `SagaInstance` as an aggregate, `SagaStore` as an abstract class, `StepExecutor`, `CompensationRunner`, `LeaseKeeper`, `SagaRecoveryJob`, `SagaRetentionJob`, `SagaEventPublisher`, `SagaEngine` with `start` and `resume`, `Sagas`, `SagaModule` (`forRoot({ store })`, `forFeature`), `TypeOrmSagaStore`, `SagaInstanceEntity`, `SagaStepLogEntity`, `platformSagaShardEntities`, `platformSagaShardMigrations`, `@platform/saga/test-utils` with `InMemorySagaStore` and `runSagaStoreContract`.
- **Specific acceptance:**
  - `runSagaStoreContract` passes with `InMemorySagaStore` and with `TypeOrmSagaStore` on real Postgres: fencing by `version` and `lease_token`, `LeaseLost`, `ConcurrentModification`, `findRecoverable` with `SKIP LOCKED` and writing the instance and the step in the same transaction.
  - A three-step saga that fails on the third compensates the first two with the stored input and output, and the result is identical after restarting the process halfway (the test kills the engine between `Dispatched` and the response and `SagaRecoveryJob.run()` resumes it with the same idempotency key).
  - `saga-engine.ts` does not exist as a file of more than 200 lines; `util.ts`, `engine-setup.ts`, `step-call.ts`, `transitions.ts` and `model.ts` no longer export loose functions; the engine's test file is split by collaborator.
  - The `random`, `owner`, `leaseMs` and `maxStepDurationMs` options live in the module configuration with default values.
  - A use case injects `Sagas` and calls `await this.sagas.start(CreateTenantSaga, state, { idempotencyKey })` in a module test.
  - SCC with `platform-saga,platform-adapters-postgres`.
- **Split:** Haiku 1: `SagaInstance`, `StepExecutor`, `CompensationRunner` and their tests. Haiku 2: `TypeOrmSagaStore`, entities, migrations, `LeaseKeeper`, jobs and `SagaModule`. The guide writes `SagaEngine` and the `SagaStore` contract.

**Wave 3 close:** global typecheck, and the general runs the integration tests of the five projects with Docker (`INTEGRATION_TESTS=require`).

### 3.6 Wave 4: closing the base and starting F4

#### WP-13. Closing the base (M)

- **Exclusive folders:** `backend/libs/contracts/platform/src/{enums,errors}/**`, `backend/libs/platform/primitives/src` (removing the re-exports), `backend/tools/platform-smoke/**` (new project of type `type:tool`), `docs/ARCHITECTURE.md`, `docs/design/f4-identity.md`, `docs/adr/**`, and the three shared files.
- **Closes:** T2 and CTR-1 (cleanup of the central catalog), T9, reducing the 97 to the exception list, 2.17 (ADR) and the F4 adjustments in section 4.3.
- **Consumes:** everything above.
- **Produces:** `SmokeAppModule`, which is the section 6 example compiled and running, with its integration test; the central catalog with only cross-cutting codes; updated documentation.
- **Specific acceptance:**
  - `platform-error-code.enum.ts` and `platform-error-catalog.ts` only have public and cross-cutting codes; no observable code was lost (the test compares the set of codes of each library before and after).
  - The smoke test, with real two-shard Postgres and Valkey (and SNS and SQS fakes): a use case saves an entity and an event in the same transaction, the `OutboxRelayJob` publishes it after commit, a `@Subscribe` consumes it only once even if it arrives duplicated, a two-step saga finishes, a `CacheAside` is invalidated after commit, and on closing the app all resources are released with no open handles (`--detectOpenHandles`).
  - `node .claude/skills/backend-structure/scripts/check-structure.mjs --all .` only reports the declared exceptions (about 12, from the contracts DSL and the `tools` `main()` functions).
  - `pnpm nx run-many -t lint test typecheck build` over the whole backend, with 80/80/80/75 coverage per project.
  - `contracts-export:check` and `contracts_gen --check` green.
- **Split:** Haiku 1: catalog cleanup, re-exports and the code consistency test. Haiku 2: `platform-smoke`. The guide reviews documentation and ADRs.

## 4. Order and start of F4

### 4.1 Why this order

The table of waves and squads is in the [plan](README.md#execution-order-by-waves).

- Wave 0 goes first because everything else imports `RandomSource`, `Guard`, `Deadline` and the aliases. WP-02 and WP-03 do not depend on WP-01 and do not share files with it.
- Wave 1 groups what only depends on the foundations. Observability goes with config because of the `LogLevel` change; scheduling goes with sharding because neither blocks the other and messaging needs the runner in wave 2.
- Wave 2 puts persistence as early as possible because it is the critical path: persistence, then the TypeORM stores, then sagas and F4. Messaging and internal-api fit because they depend on wave 1 and not on each other.
- Wave 3 depends on messaging (aws binds its ports), on persistence (the stores) and on internal-api (sagas). The three packages do not share folders: WP-12 owns `adapters/postgres/src/saga/`.
- Sagas go after persistence and not the other way around because `TypeOrmSagaStore` needs the `EntityManager` of the active transaction.

### 4.2 When F4 starts

Wave 1 of F4 starts on the new base in two steps.

- **Plan wave 4:** F4-WP1 (`@platform/auth` and its Valkey adapter) and F4-WP4 (`@platform/service`). They need `BloomModule`, `ValkeyModule`, `ObservabilityModule`, `PersistenceModule`, `ShardScope`, `MessagingModule`, `InternalApiModule` and `AppConfig`, all integrated when wave 3 finishes. They run alongside WP-13 because they do not touch its folders: WP-13 is the only one that edits the shared files and the catalog.
- **Plan wave 5:** F4-WP5 (identity and front contract, which does edit `contracts/platform/src/{enums,errors}`) and F4-WP2 (`@platform/http`). F4-WP5 waits for WP-13 to integrate the clean catalog, and F4-WP2 waits for F4-WP1 and for the `InternalApiController` from WP-08.
- **Plan wave 6:** F4-WP6, which needs WP-2 and WP-4 integrated. Waves 2 and 3 of F4 follow the F4 design with three squads per wave.

### 4.3 Adjustments this plan forces on the F4 design

They were applied in WP-13 to the [F4 design](../design/f4-identity.md).

| F4 section                                         | Adjustment                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.3 and WP3 (`@platform/rate-limit`)               | It already exists and is refactored in WP-05 and WP-11. F4's WP3 disappears. All that remains of it is the mapping from `RateLimitTier` to rules, which lives in `@platform/http`.                                                                                                                                                                                                                                                            |
| 3.4.2 row 1 (`RequestContextMiddleware`)           | It belongs to `@platform/observability/nest` (WP-04). F4's WP2 imports it.                                                                                                                                                                                                                                                                                                                                                                    |
| 3.4.3 (internal API over HTTP)                     | `InternalApiController`, `HttpTransport` and the HMAC classes belong to `@platform/internal-api` (WP-08). F4's WP2 only mounts the controller without going through `EndpointGuard`.                                                                                                                                                                                                                                                          |
| 3.4.2 row 8 (`ProblemDetailsFilter`)               | It uses `ProblemDetailsFactory` (WP-02) and composes the service's catalog with those of the libraries (D2).                                                                                                                                                                                                                                                                                                                                  |
| 3.5 (`@platform/service`)                          | It gets thinner. `PlatformRuntimeModule` becomes the composition of the library modules (section 6). `IntervalJob` and `OutboxRelayWorker` disappear in favor of `ScheduledJob` and `OutboxRelayJob`. `HealthEndpoints` uses `HealthRegistry`. `runMigrations` delegates to `ShardedMigrationRunner`. `ServiceDefinition.migrations` stops receiving `SqlMigration` and receives the reference `DataSource`s. `bootstrapHttp` stays the same. |
| 3.5 (`databaseConfigSchema`, `valkeyConfigSchema`) | They are the `DatabaseConfig` and `ValkeyConfig` sections from WP-09 and WP-11.                                                                                                                                                                                                                                                                                                                                                               |
| 3.6 (`ShardScope`)                                 | It is delivered in WP-09 with the `requireScope` option and the `CROSS_SHARD_TX` error. It leaves the scope of F4's WP4.                                                                                                                                                                                                                                                                                                                      |
| 4 and 6.3 (migrations per module)                  | Identity's migrations are TypeORM migrations (approved design). The split of timestamp ranges per module is kept.                                                                                                                                                                                                                                                                                                                             |
| `TenantOnboarding` operations                      | They use `SagaModule.forFeature`.                                                                                                                                                                                                                                                                                                                                                                                                             |

## 5. Risks, breaking changes and what is left out

### 5.1 Risks

| Risk                                                                                           | Effect                                         | Mitigation                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SWC with decorators: TypeORM entities and Nest injections need decorator metadata in Jest      | Module and entity tests fail in confusing ways | Each guide checks the `.spec.swcrc` of its projects (decorator metadata enabled) and leaves a minimal `@Injectable` test and, in persistence, an entity test. Circular references between entities are resolved with `Relation<>`. |
| Haiku follows instructions literally and an ambiguous skeleton is implemented wrong            | Rework                                         | The guide delivers signatures and the contract test before splitting the work, and reviews each delivery against the SCC.                                                                                                          |
| Changing an interface in one wave breaks tests of libraries that another squad already touched | Costly merge                                   | Interfaces are converted without adding members (D1) and the `@deprecated` re-exports live until WP-13.                                                                                                                            |
| Telemetry does not instrument if it is loaded after `http`, `pg` or `iovalkey`                 | Empty traces                                   | `@platform/observability/setup` stays as the first import (D3) and WP-13 verifies it in the smoke test.                                                                                                                            |
| The in-house cron has calendar bugs                                                            | A job runs at the wrong time                   | Four edge cases in `it.each` (year change, February 29, Sunday, seconds) and UTC only.                                                                                                                                             |
| Containerized Postgres makes tests slow                                                        | Longer CI                                      | `ContainerRuntime` in `skip` mode by default locally; CI uses `require`; integration tests are limited to the store contracts and the smoke test.                                                                                  |
| Nest shutdown order (hooks of sibling modules have no guaranteed order)                        | A client closes before its consumer            | Stop the work generators in `onModuleDestroy` of non-global modules and close resources in `onModuleDestroy` of global modules imported earlier (D3); the smoke test checks it.                                                    |
| Module wiring is only truly tested in wave 4                                                   | Late composition errors                        | Each of waves 1 to 3 closes with a startup test of the modules already integrated, and WP-13 reserves time for fixes.                                                                                                              |
| Double code pattern rule                                                                       | A code valid in one place and not in another   | Consistency test in `primitives` that walks every catalog.                                                                                                                                                                         |
| Three squads edit the same `index.ts` of a library                                             | Conflicts                                      | Each library has a single owner per wave; its owner edits `index.ts`.                                                                                                                                                              |

### 5.2 Breaking API changes

None affects a service, because there is no `backend/apps`. They affect F4, which is built afterwards.

- Transaction and idempotency ports: from `@platform/primitives` to `@platform/kernel`. Re-export until WP-13.
- `Clock`, `IdGenerator`, `TransactionManager`, `IdempotencyStore`, `CachePort`, `LoggerPort`, `MetricsPort`, `OutboxStore` and the other ports go from interface to abstract class. Whoever implements them with `implements` does not change; whoever used the interface as a type does not change.
- `LogLevel` leaves `@platform/config` and lives only in `@platform/observability`.
- `ResiliencePolicyName` (enum) is replaced by `PolicyName`; `Ai`, `AiStreaming` and `Email` are deleted.
- Static `RequestContext` becomes the injectable `RequestContextStore`. The uses of `RequestContext.current()` in persistence, saga and internal-api are updated in their waves.
- `setupTelemetry` and `telemetryOptionsFromConfig` are replaced by `TelemetryBootstrap`.
- `CacheAside`: the `random`, `singleFlight`, `maxValueBytes` and `InvalidateOptions.afterCommit` options disappear.
- `OutboxRelayOptions.backoff` (the old type), and `newId` and `now` from `createEnvelope`.
- Messaging: `createEnvelope`, `parseEnvelope` and `toWireEnvelope` move to `EnvelopeFactory` and `EnvelopeParser`; `TenantVerifier` goes from function to class.
- `InternalClient`: the `sleep`, `random` and `clock` options are lost.
- `createPersistence`, `Database`, `SqlSession`, `BaseRepository` on top of `pg` and `SqlMigration`: replaced by TypeORM (approved design). The `adapters-postgres` stores are renamed (`Postgres*Store` to `TypeOrm*Store`).
- `InMemory*` leaves the public indexes (D9).
- Observable error codes do not change value.
- `@shared/utils` disappears and `Money` moves to the kernel.
- Environment variables: `POSTGRES_ADAPTER_INTEGRATION`, `PERSISTENCE_INTEGRATION` and `VALKEY_INTEGRATION` are replaced by `INTEGRATION_TESTS`.

### 5.3 What is left out

| What                                               | Reason                                                                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `SecretsProvider` with AWS Secrets Manager (CFG-5) | It is a new feature with no consumer today. It comes in with F12, when Terraform and the libraries align variables.                          |
| `ValkeyIdempotencyStore` (VLK-4)                   | Product decision, no consumer.                                                                                                               |
| Deleting the messaging topology DSL (MSG-4)        | It breaks about 36 tests and the value is cleanup. It is picked up again when there is a second consumer or a real service that asks for it. |
| `@Resilient` decorator                             | `registry.execute` is enough and a decorator hides the policy. The skill documents it as the only way.                                       |
| SigV4 signer for the internal API                  | It belongs to F12. The `InternalCallSigner` port already allows it.                                                                          |
| App and module generator (F11)                     | It has its own scope. This plan leaves the example `AppModule` as a reference.                                                               |
| Moving `LruMap` to primitives                      | Only sharding uses it. It stays internal to `PlacementCache`.                                                                                |
| `AWS Step Functions` as orchestrator               | Already dismissed in the approved design.                                                                                                    |
| Touching the front                                 | No change in this plan alters the shape of a contract, so the Dart does not need to be regenerated. F4-WP5 will do it later.                 |

## 6. Guide to wiring a new service

### 6.1 Startup

`main.ts` loads telemetry first and only then NestJS:

```ts
// backend/apps/identity/src/main.ts
import './instrumentation.js'; // TelemetryBootstrap.start(process.env)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const app = await NestFactory.create(AppModule);
app.enableShutdownHooks(); // triggers BeforeApplicationShutdown, OnModuleDestroy and OnApplicationShutdown
await app.listen(3000);
```

### 6.2 Example `AppModule`

The service names the adapters it wants; the core libraries never import them. Removing a line removes a capability. `backend/tools/platform-smoke` compiles and runs this composition with its integration test.

```ts
@Module({
  imports: [
    // The service's own configuration. The libraries bring their sections.
    ConfigModule.forRoot({ env: process.env }),

    ObservabilityModule.forRoot({ telemetry }),
    ResilienceModule.forRoot(),
    SchedulingModule.forRoot({
      mode: SchedulingMode.InProcess,
      logger: LoggerPort,
      metrics: MetricsPort,
    }),

    // Infrastructure adapters.
    ValkeyModule.forRoot({ connectionName: SERVICE_NAME }),
    AwsModule.forRoot({
      messaging: { topology: identityTopology, source: SERVICE_NAME },
    }),
    PersistenceModule.forRoot({
      shard: { entities: shardEntities, migrations: shardMigrations },
      catalog: {
        entities: platformCatalogEntities,
        migrations: platformCatalogMigrations,
      },
      shardLister: DirectoryShardLister,
    }),
    PostgresPlatformModule.forRoot(),

    // Core, with the adapter chosen through `Type<Port>`.
    ShardingModule.forRoot({
      routingCache: ValkeyRoutingCache,
      channel: ValkeyShardDirectoryChannel,
      directory: TypeOrmDirectoryStore,
    }),
    CacheModule.forRoot({ store: ValkeyCache, metrics: MetricsPort }),
    RateLimitModule.forRoot({
      limiter: ValkeyRateLimiter,
      degradeLocally: true,
    }),
    MessagingModule.forRoot({
      source: SERVICE_NAME,
      consumer: QueueName.Orders,
      topology: identityTopology,
      outboxStore: TypeOrmOutboxStore,
      processedStore: TypeOrmProcessedMessageStore,
      publisher: SnsSqsEnvelopePublisher,
      bus: SnsSqsMessageBus,
      relay: true, // registers OutboxRelayJob and the retention jobs
      relayScopes: ShardedRelayScopes,
    }),
    // Not global: it is destroyed before AwsModule and stops polling before the clients close.
    SqsConsumerModule.forRoot({
      topology: identityTopology,
      queue: QueueName.Orders,
    }),
    InternalApiModule.forRoot({
      operations: identityOperations,
      transport: InternalTransportKind.Http,
      processedStore: TypeOrmIdempotencyStore,
    }),
    SagaPostgresModule,
    SagaModule.forRoot({
      store: TypeOrmSagaStore,
      scopes: ShardedSagaScopes,
    }),

    // Business modules.
    UsersModule,
  ],
})
export class AppModule {}
```

Without Valkey (local mode with a single instance), the service omits `ValkeyModule` and leaves `CacheModule.forRoot()` and `RateLimitModule.forRoot()` without options: they use `InMemoryCache` and `InMemoryRateLimiter`, and `ShardingModule` uses `NullRoutingCache` and `InProcessDirectoryChannel`. Exclusive jobs use `InProcessJobLock`.

### 6.3 Business module

Each module registers its own pieces with `forFeature` and lets the explorer find the consumers and handlers:

```ts
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [UserEntity],
      sharding: { key: ShardKey.User },
    }),
    CacheModule.forFeature({ namespace: CacheNamespace.Users, ttlMs: 60_000 }),
    SagaModule.forFeature([CreateTenantSaga]),
    ResilienceModule.forFeature({
      name: PolicyName.of('mailer'),
      policy: mailerPolicy,
    }),
  ],
  providers: [
    UserMapper,
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    RegisterUser, // use case
    WelcomeEmailConsumer, // class with @Subscribe
    CreateTenantHandler, // class with @InternalHandler
    BloomRebuildUsersJob, // a ScheduledJob of its own: the runner discovers it
  ],
})
export class UsersModule {}
```

### 6.4 New service checklist

1. `instrumentation.ts` first and `app.enableShutdownHooks()`.
2. One enum for each event, error, permission, queue and job of the service, and its own error catalog that `ErrorCatalogRegistry` composes with `platformErrorCatalog` and those of the libraries used.
3. Entities and migrations generated with `pnpm nx run <service>:migration-generate`; `synchronize` off.
4. Consumers with `@Subscribe` and handlers with `@InternalHandler` in `presentation/`; the use case is injected, no logic is written in the class.
5. One `forFeature` per business module and no platform class instantiated with `new`.
6. A module test with `@nestjs/testing` and the doubles from `@platform/<lib>/test-utils`; integration tests are named `.int-spec.ts`.
7. `pnpm nx run-many -t lint test typecheck --projects=<service>` and `node .claude/skills/backend-structure/scripts/check-structure.mjs --changed .` green, with 80/80/80/75 coverage.
