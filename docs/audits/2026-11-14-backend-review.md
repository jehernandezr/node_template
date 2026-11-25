# Review of the node_template backend libraries

Read-only review of `backend/libs` and `backend/tools` against the `backend-*` skills, against the user's three requirements (enterprise code, TypeORM, easy to use) and against what was already decided (persistence with TypeORM and redesigned sagas).

All paths are relative to `/Users/jonatan/Documents/projects/node_template/backend`. Effort: S (less than half a day), M (one to three days), L (more than three days).

## 0. Quick read

The code is disciplined in the small: the clock and ids are injected, there is no `any`, no `eslint-disable`, `process.env` is only read in `config`, and most stateful pieces are already classes. The problems are about shape and assembly, not care.

There are five underlying problems.

1. **No library has a NestJS layer.** There is not a single `@Module`, `@Injectable`, token or lifecycle hook in `libs/`, and `@nestjs/*` is not even in `package.json`. A new service has to build `new JsonLogger(...)`, `new ResilienceRegistry(...)`, `new OutboxRelay(...)` by hand and close the clients itself. This is the biggest gap against "easy to use".
2. **Dependencies between libraries point the wrong way in three places.** `kernel` imports `@contracts/platform`; `observability` imports `config` only for an enum; `contracts/platform` contains the internal error catalog of every library.
3. **Systematic duplication.** There are two error code enums per library (its own and `PlatformErrorCode`), four implementations of waiting with a deadline, four retry policy models and four copies of Docker detection.
4. **Complete ports with nobody running them.** The outbox relay, the saga recovery job, the bloom filter rebuild and the idempotency cleanup exist as `runOnce` or `purge` methods, but nobody schedules them. The `internal-api` transport only has the in-process version.
5. **Test doubles inside production code.** Eight `InMemory*` classes ship through the public `index.ts`. Only `rate-limit` follows the skill's rule (`@platform/rate-limit/test-utils`).

Files over 400 lines (excluding tests): `saga/engine/saga-engine.ts` 1093, `sharding/shard-router.ts` 733, `persistence/repository/base-repository.ts` 678, `messaging/dispatch/message-dispatcher.ts` 601, `internal-api/router.ts` 537, `resilience/registry.ts` 532, `contracts/platform/errors/platform-error-catalog.ts` 521, `adapters/aws/sqs-delivery-runner.ts` 503, `persistence/database.ts` 417, `messaging/topology/topology.ts` 401. The tests have four files over 790 lines.

---

## 1. Cross-cutting findings

They are numbered with T. Each library section refers to them instead of repeating them.

### T1. The NestJS composition layer is missing (high impact, effort L)

No file in `libs/` uses NestJS. The `backend-nestjs-composition` skill requires one module per piece, tokens per port, `useFactory` with configuration and ordered shutdown. Today:

- Each library exposes classes with a huge `options` object and leaves the assembly to the service.
- Ports are sometimes interfaces (`CachePort`, `LoggerPort`, `MetricsPort`, `IdempotencyStore`, `OutboxStore`) and sometimes abstract classes (`RateLimiter`). Without an interface plus a `Symbol` they cannot be injected. No library has a tokens file.
- No adapter closes its resources: `aws-clients.ts:29` asks you to call `destroyAwsMessagingClients` by hand, Valkey has no `quit`, `SqsDeliveryRunner.start/stop` and `SagaRecoveryJob.runOnce` do not hang off `onModuleInit/Destroy`.
- There is no `HealthIndicator` or `check()` method in cache, Valkey, Postgres or SQS, and the observability skill requires `/health/ready`.

Proposal, common to all libraries:

- Each library with wiring gets a `src/nest/` folder with `<Lib>Module`, exposed as the sub-entry `@platform/<lib>/nest`. The library core still does not import NestJS; only the sub-entry does. That keeps `domain/` and `kernel` clean, and adapters can depend on another library's core without pulling in NestJS.
- Module convention: `forRoot(options?)` for platform-wide setup with defaults taken from `AppConfig`, `forRootAsync({ inject, useFactory })` for whoever builds the options from their configuration, and `forFeature(...)` when the service registers something of its own (a consumer, a saga definition, a resilience policy).
- One `tokens.ts` file per library with the `Symbol`s exported next to the port. Rule: abstract class for ports with one active implementation per service (`RateLimiter`, `CachePort`), `Symbol` only when several coexist.
- Every open resource implements `OnModuleDestroy`; every network adapter exposes `HealthCheckable.check(): Promise<HealthStatus>` and a platform `HealthModule` aggregates them.

Target usage, which must be enough for a new service:

```ts
@Module({
  imports: [
    ConfigModule.forRoot({ schema: serviceConfigSchema }),
    ObservabilityModule.forRoot(),
    ResilienceModule.forRoot(),
    MessagingModule.forRoot({ topology: identityTopology }),
    ValkeyModule.forRoot(),
    CacheModule.forFeature({ namespace: 'identity' }),
  ],
})
export class AppModule {}
```

### T2. Two sources of truth for error codes (high impact, effort M)

Six libraries declare their own code enum with the same values as `PlatformErrorCode`: `CacheErrorCode` (`cache/src/errors.ts:5`), `BloomErrorCode` (`bloom/src/bloom-error.ts:4`), `ConfigErrorCode` (`config/src/errors.ts:5`), `ShardingErrorCode` (`sharding/src/errors.ts:5`), `ValkeyErrorCode` (`adapters/valkey/src/valkey-error.ts:5`), `CriteriaErrorCode` (`criteria/src/enums.ts:37`). The rest (primitives, messaging, saga, internal-api, persistence, resilience) use `PlatformErrorCode` directly. A new code requires touching two places and nothing stops them from diverging.

In addition, `contracts/platform/src/errors/platform-error-catalog.ts` (521 lines) lists the entries of every library, more than 70 internal ones against 29 public ones. The platform contract ends up knowing about `saga`, `bloom` or `valkey`, which is a reversed dependency.

Proposal:

- A single enum per library, the local one, with the format `PLATFORM.<LIB>.<ERROR>`. `PlatformErrorCode` keeps only the cross-cutting, public codes (validation, auth, rate limit, not found, conflict, internal).
- Each library declares its own `ErrorCatalog` (a class from `@contracts/platform/kit`) with `httpStatus`, `retryable` and `audience`, and `defineServiceContract` composes them. The public catalog that goes to the front still comes from contracts and does not include the internal entries.
- The repeated base class goes away: `CacheError`, `BloomError`, `SagaError`, `MessagingError`, `PersistenceError`, `ShardingError`, `ConfigValidationError` and `InternalApiError` share the `code + failureKind` pattern. A single `PlatformError` with a mandatory `failureKind` in the kernel (see KRN-2) removes the `abstract readonly failureKind` repeated in each subclass.

### T3. Four implementations of "wait with a deadline" and four retry models (medium impact, effort M)

- Waiting for a promise with a signal and a deadline: `primitives/src/timers.ts:123` (`raceDeadline`), `cache/src/wait.ts:11-78` (`waitFor`, `cancellation`, copied `abortReason`), `sharding/src/lookup-budget.ts:9` (`LookupBudget`, with copied `MAX_TIMER_MS`) and `adapters/aws/src/sqs-delivery-runner.ts:130` (its own `sleep`). `abortReason` appears in `timers.ts:19` and `wait.ts:15`.
- Retries with backoff: `internal-api/src/client.ts:114` (its own loop with injectable `sleep` and `random`), `resilience/registry.ts:293`, `messaging/topology/retry-policy.ts:37` (`RetryPolicy` with `jitter`), `saga/engine/engine-setup.ts:22` (`defaultBackoff`). There are four ways to declare the policy: internal-api's `RetryPolicy` (`contract.ts:19`), messaging's `RetryPolicy`, `ResilienceRetryConfig` and contracts' `OperationRetryPolicy`. Two of them also export `DEFAULT_RETRY_POLICY` with different values (`internal-api/contract.ts:60` and `messaging/topology/queue-def.ts:37`).
- The observability skill says "`@platform/resilience` is used, not hand-rolled loops". The only real consumer of `resilience` is `cache`; nobody uses the `Database`, `ExternalApi`, `Ai`, `AiStreaming`, `Email` and `Queue` policies.

Proposal: a `Deadline` class with `race(work)` and `wait(promise)` in `primitives` replaces `wait.ts` and `LookupBudget`. `InternalClient` and `SqsDeliveryRunner` delegate retries to `ResilienceRegistry` with named policies. A single `RetryPolicy` (`maxAttempts`, `baseMs`, `maxMs`, `strategy`) lives in `primitives` and the other three reuse it.

### T4. Randomness source without a port (low impact, effort S)

Five classes receive `random?: () => number` with `Math.random` as the default: `primitives/backoff.ts:85`, `cache/cache-aside.ts:134`, `cache/jittered-ttl.ts:17`, `resilience/registry.ts:176`, `internal-api/client.ts:127`, `observability/sampling.ts:8`. And three use `randomUUID` or `randomBytes` directly (`cache/versioned-keyspace.ts:67,73,78`, `observability/trace.ts:85`). Proposal: `RandomSource` in the kernel (`next(): number`, `SystemRandomSource`) and `IdGenerator` for tokens. This removes seven constructor options that nobody uses in production.

### T5. Test doubles in the public index (medium impact, effort M)

Shipped through `index.ts`: `InMemoryBus` (228 lines), `InMemoryOutboxStore` (193), `InMemorySagaStore` (205), `InMemoryIdempotencyStore` (123), `InMemoryProcessedMessageStore`, `InMemoryProcessedOperationStore`, `InMemoryDirectoryStore`, `InMemoryRoutingCache`, `InMemoryShardDirectoryChannel`, `InMemoryMetrics`, `NoopMetrics`. The testing skill asks for fakes as classes with the same contract test, in `__tests__/utils/` and exposed through `@platform/<lib>/test-utils`. Only `kernel` and `rate-limit` do this.

Legitimate exceptions that stay in production because they serve as degradation or local mode: `InMemoryCache` (the only mode without Valkey), `InMemoryRateLimiter` (used by `DegradingRateLimiter`), `NoopMetrics`.

Proposal: move the rest to `src/__tests__/utils/` and register `@platform/<lib>/test-utils` aliases in `tsconfig.base.json`. Each fake must pass the same `run<Port>Contract(factory)` as its real adapter. Today `adapters/postgres/src/__tests__/utils/outbox-contract.ts` and `idempotency-contract.ts` already exist and are the model.

### T6. Docker detection repeated four times (low impact, effort S)

`adapters/postgres/src/__tests__/utils/docker.ts`, `persistence/src/__tests__/utils/docker.ts`, and two inline copies in `adapters/valkey/src/__tests__/valkey.integration.spec.ts:38` and `adapters/aws/src/__tests__/sns-sqs.integration.spec.ts`. Each with its own flag (`POSTGRES_ADAPTER_INTEGRATION`, `PERSISTENCE_INTEGRATION`, `VALKEY_INTEGRATION`, another in aws) and its own CI policy. Proposal: a `ContainerRuntime` class in `kernel/src/__tests__/utils/` (existing alias `@platform/kernel/test-utils`) with `isAvailable()`, `describeIfAvailable` and a single variable `INTEGRATION_TESTS=skip|require`. The four copies are deleted.

### T7. Copied validation functions (low impact, effort S)

`assertNonNegativeFinite` in `primitives/backoff.ts:31` and `idempotency-store.ts:84`; `assertBudget` in `deadline.ts:5`; `assertCapacity` (`sharding/lru-map.ts`), `assertTtl` (`shard-router.ts:210`), `assertLease` (`message-dispatcher.ts:235`), `assertPositiveInteger` (`outbox-relay.ts:101`), `assertFinite` (`resilience/config.ts`), `assertIntegerInRange` (`bloom/limits.ts:21`), `assertIdentifier` (in `criteria/validation.ts` and `persistence/table-definition.ts`), `isPositiveInt` (`contracts/kit/define-messaging.ts:122`), `isPlainObject` (cache, primitives, kernel), `describeError` (`resilience/registry.ts:107` and `messaging/errors/describe-error.ts:2`), `codeOf` (`field-errors.ts` and `message-dispatcher.ts:230`). Each one throws a different error per library.

Proposal: a `Guard` class in `primitives` (`Guard.positiveInteger(name, value)`, `Guard.finiteAtLeast(...)`, `Guard.inRange(...)`) and an `ErrorDescriptor` (`describe(error)`, `codeOf(error)`) used by messaging, resilience and metrics alike.

### T8. Language, names and one file per class (low impact, effort M)

- Comments in Spanish in `kernel`, `config`, `observability`, `persistence`, `primitives`, `rate-limit`, `adapters/aws`, `adapters/postgres` and `contracts`; in English in `bloom`, `cache`, `criteria`, `internal-api`, `messaging`, `resilience`, `saga`, `sharding` and `adapters/valkey`. The skills and CLAUDE.md are in Spanish. They are unified in Spanish when each file is touched.
- Files without a role suffix, against `backend-code/references/naming.md`: `shard-router.ts`, `cache-aside.ts`, `topology.ts`, `util.ts` (forbidden by the skill), `types.ts`, `limits.ts`, `model.ts`.
- Several public classes per file: `cache/errors.ts` (6), `resilience/errors.ts` (5), `primitives/errors.ts` (4), `bloom/bloom-error.ts` (4), `messaging/topology/route.ts` (4), `observability/telemetry.ts` and `metrics.ts` (3 each).
- Error classes without the `Error` suffix in bloom: `InvalidParameters`, `CorruptedData`, `IncompatibleFilters` (`bloom-error.ts:19,26,33`).

### T9. Test structure

- `kernel/src/__tests__/utils/__tests__` and `rate-limit/src/__tests__/utils/__tests__` break the rule "tests of a utility go in the `__tests__` that contains it, not nested inside `utils/`".
- The Valkey and AWS integration tests are named `*.integration.spec.ts`; Jest picks them up as unit tests because they end in `.spec.ts`. The convention in `jest.preset.js` and in the skill is `.int-spec.ts`.
- There are only two `.int-spec.ts` suites (`persistence`, `adapters/postgres`); `valkey` and `aws` have integration tests under another name. There is no integration of cache or rate-limit against real Valkey outside those.

---

## 2. Findings per library

### 2.1 kernel

Small and clean (369 lines). Three points.

**KRN-1. Reversed dependency: `kernel` imports `@contracts/platform` (high, S).**
`kernel/src/invalid-id.error.ts:1` imports `PlatformErrorCode` just for one code. The skill says the domain depends only on `@platform/kernel`, and `kernel` should not depend on anything. With T2 (each library has its own enum) the kernel declares `KernelErrorCode.InvalidId` and the dependency disappears.

**KRN-2. `failureKind` repeated and inconsistent (medium, S).**
`DomainError` (`domain-error.ts:19`) computes `failureKind` from `retryable`; `PlatformError` (`platform-error.ts:32`) does not declare it, and each library subclass declares it by hand (`abstract readonly failureKind` in cache, resilience, saga, internal-api, etc.). Proposal: `PlatformError` receives `failureKind` in the constructor (default `Permanent`, or `Transient` if `retryable`), and subclasses pass the kind in `super`. Dozens of `readonly failureKind = ...` lines are deleted.

**KRN-3. Unused code and loose functions (low, S).**

- `result.ts` (36 lines, functions `ok`, `err`, `isOk`, `isErr`) is not imported by any other library. It competes with primitives' `CallOutcome` and with the `Result` in `internal-api/result.ts`. Pick one: `Result<T,E>` as a class with `map`/`unwrap` if services are going to use it, or delete it.
- `platform-error.ts:8` `isErrorCode` and `:54` `isPlatformError` are loose functions. They become static methods `PlatformError.is(value)` and `ErrorCode.isValid(value)`. `ERROR_CODE_PATTERN` also exists in `contracts/kit/error-catalog.ts:7` with a different expression (`^[A-Z]+(\.[A-Z_]+){2}$` versus `^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*){2,}$`), so a code can pass in one place and fail in the other. Keep one, the kernel's.
- `id-generator.ts:22` receives `nowMs: () => number = Date.now` instead of a `Clock`, unlike the rest of the code. It must receive `Clock`.
- `Id` wraps a `ValueObject<{value}>`, but code in other libraries passes strings. When TypeORM arrives, an `IdTransformer` in persistence for `uuid` columns is worthwhile.

**KRN-4. Missing what services will need (medium, M).** `UseCase` is an interface, and there is no `Specification`, no `DomainEvent` with an enum type, no `RandomSource` (T4), no `HealthCheckable` (T1). They are added to the kernel as minimal interfaces.

### 2.2 primitives

1,301 lines. Mixes pure utilities with ports from other layers.

**PRM-1. Ports that are not primitives (high, M).** `transaction/transaction-manager.ts` (`TransactionManager`, `UnitOfWork`, `IsolationLevel`) and `idempotency/idempotency-store.ts` (`IdempotencyStore`, `ClaimState`) are application ports. `persistence/src/enums.ts:15` redefines `IsolationLevel` with the same values. Proposal: move the ports to `kernel` (or to a new `ports/` folder in the kernel) and leave only computation in `primitives` (backoff, hash, canonical JSON, deadline). The persistence copy must be deleted when building the TypeORM layer.

**PRM-2. Loose functions that should be classes (medium, M).** The script lists `backoff.ts`, `call-outcome.ts`, `canonical-json.ts`, `failure.ts`, `hash.ts`, `idempotency-store.ts` and `timers.ts`. Concrete proposal:

- `Backoff` (class with `delay(attempt)`; the constructor validates once; `Backoff.fullJitter(...)`, `Backoff.equalJitter(...)`). Replaces `backoffDelay`, `createBackoff`, `validateBackoffOptions` (`backoff.ts:38,66,100`) and saga's `defaultBackoff`.
- `FailureClassifier` (injectable, with the `TRANSIENT_NETWORK_CODES` and `TRANSIENT_STATUS` tables as constructor arguments with defaults, extendable per adapter) replaces `classifyFailure` and `isTransientError` (`failure.ts:106,133`). Today each adapter translates its errors to `failureKind` by convention; with a class it can register a `FailureRule`.
- `RetryAfterParser` replaces `retryAfterMs` (`failure.ts:153`, with `nowMs = Date.now()` as the default, a clock read inside the function) and resilience's `retryAfterHintMs` (`transient.ts:61`), which wraps it.
- `CanonicalJson` (`canonicalize`, `stringify`, `digest`) and `Hashes` in `hash.ts` (`fnv1a32`, `fnv1a32Hex`).
- `Deadline` is already a class; it absorbs `raceDeadline`, `abortableSleep` and `armTimer` (`timers.ts:29,56,123`) as methods (T3). `timers.ts:150` uses `Date.now()` instead of the `Deadline`'s `Clock`.
- `CallOutcome` (`call-outcome.ts:153`) is an object literal with functions plus union types. It is fine as a discriminated union, but `fromError` (:123) should be a `CallOutcomeFactory` that receives the `FailureClassifier`, not a function that calls the global `classifyFailure`.

**PRM-3. Meaningful sizes and constants without an owner (low, S).** `MAX_TIMER_MS` is also in `sharding/lookup-budget.ts:4`; `MAX_CAUSE_DEPTH` and `DEFAULT_RETRY_AFTER_MAX_MS` are re-exported to resilience. `InMemoryIdempotencyStore` (T5) moves to `test-utils`.

### 2.3 criteria

996 lines. Affected by the TypeORM decision.

**CRI-1. Clashes with what was decided: it generates its own SQL (high, L, absorbed by the persistence team).** `sql.ts` (283 lines, `toSql` of about 200) and `postgres.ts` produce strings with `$n`. With TypeORM the translator must produce a `SelectQueryBuilder` or `FindOptionsWhere`. The AST (`ast.ts`) and the `Criteria` class (`criteria.ts:186`, a typed builder with `WhereClause`) are kept: they are engine-agnostic and well designed. `toSql` is replaced by `TypeOrmCriteriaTranslator` (a class that receives the `Repository` and an allowlist of fields).

**CRI-2. Cursor with functions and the secret as a parameter (medium, S).** `cursor.ts:66,101` (`encodeCursor`, `decodeCursor`) receive `CursorOptions` with the secret on every call; `takePage` (`page.ts:12`) forwards it. Proposal: an injectable `CursorCodec` built once with the signing secret (from `AppConfig`), and a `PageBuilder` that receives it through the constructor. The service asks for `CursorCodec` instead of passing the secret through four layers.

**CRI-3. Validation with loose functions and its own error (low, S).** `validation.ts` groups six `assert*`. They become a `CriteriaValidator` class or are absorbed into `Guard` (T7). `CriteriaError` is the library's only error and its local enum duplicates `PlatformErrorCode` (T2).

**CRI-4. Dependency on `@contracts/platform` for `Pagination` (low, S).** `validation.ts:1` and `page.ts:1` import contract constants. Acceptable, but `Page` should come from the kernel or be defined here and re-exported to contracts, not the other way around.

### 2.4 config

312 lines. Small, but it does three things that are not its job.

**CFG-1. `base-config.ts` mixes unrelated concerns and forces them on everyone (high, S).** `baseConfigSchema` (`base-config.ts:30-59`) puts `DB_LOG_QUERIES`, `DB_SLOW_QUERY_MS`, `OTEL_SDK_DISABLED`, `OTEL_METRIC_EXPORT_INTERVAL` and `LOG_*` in the schema every service extends. A service without a database receives database variables. The skill asks for config grouped by topic. Proposal: schemas per topic (`serviceConfigSchema`, `loggingConfigSchema`, `telemetryConfigSchema`, `databaseConfigSchema`) that each module contributes with `forRoot()`. The config module composes them and the service does not write `.extend(...)`.

**CFG-2. `LogLevel` lives in config and observability depends on config (medium, S).** `config/src/log-level.ts` and `observability/src/logger.ts:8,13`. Proposal: the enum goes into `observability`; `config` does not know it and `loggingConfigSchema` is defined in `observability/src/nest/`. This removes the `observability -> config` dependency.

**CFG-3. `defineConfig` returns an object literal and reads `process.env` by default (medium, S).** `define-config.ts:20` (`load(env = process.env)`) and `ConfigDefinition` as a one-method interface. It is a factory function plus a module singleton: `awsConfig` (`aws-config.ts:46`), `valkeyConfig` and similar are created when the file is imported. Proposal: `ConfigLoader` (class) with `load<T>(schema)`; `ConfigModule.forRoot({ schema })` runs it once at startup and exposes `AppConfig` as an immutable provider, with typed `ConfigService.get(token)`. Nobody reads `process.env` again.

**CFG-4. `as unknown as` and factories without a class (low, S).** `env.ts:63` uses a double cast; the `match` must be typed with a tuple. `env.ts` (`envBoolean`, `envNumber`, `envList`, `envDuration`) and `secret.ts:52` (`secret()`) are zod schema factories. They are acceptable as a declarative DSL (see section 3, exceptions), but `isSecret` and `Secret` with a module-level `WeakMap` (`secret.ts:8`) are global state; `Secret` can keep the value in a private `#value` field and drop the `WeakMap`.

**CFG-5. Options and schemas nobody declares (low, S).** `Secret` and `secret()` are not used by any library (valkey, aws and postgres have no secrets in their schemas yet, and Terraform's `DB_CREDENTIALS` arrives without a schema). They are kept because of the security skill, but a `SecretsProvider` (port) with an AWS Secrets Manager adapter is needed; today the Terraform variable contract and the libraries' contract do not match (see audit BE-02 of November 14).

### 2.5 observability

1,708 lines. The largest library in functions and in global state.

**OBS-1. Global state and static APIs (high, M).**

- `request-context.ts:76` `const storage = new AsyncLocalStorage()` at module level, and `RequestContext` with `static` methods (`run`, `current`, :99). Every caller uses `RequestContext.current()` without injection (`logger.ts:106`, `persistence-context.ts`, saga, internal-api).
- `logger.ts:102,105` (`RESERVED_FIELDS`, `contextFields()`) and `logger.ts:258` `defaultSink` writes directly to `process.stdout`.
- `spans.ts:33` `platformTracer()` and `withSpan` (:79) use the global OTel tracer.
- `redaction.ts:22-130`: eight module-level `Set`s and expressions; `redact` and `redactString` are functions.
- `propagation.ts:33` creates `EXTERNAL_TRACE_ID_KEY` at module level.

Proposed classes:

- `RequestContextStore` (injectable, wraps the `AsyncLocalStorage`; `run(init, fn)`, `current()`). The `AsyncLocalStorage` becomes a private field. A NestJS `RequestContextInterceptor` and `RequestContextMiddleware` feed it.
- `Tracing` (class with `withSpan(name, fn, options)` and `current()`), injectable with the `Tracer`.
- `Redactor` (class) with `redact(value)`, `redactString(text)`; its word lists come in through the constructor with defaults and can be extended per service.
- `StructuredLogger` (implements `LoggerPort`) with two destinations as a strategy, not with an internal `if`: `StdoutLogSink` and `OtlpLogSink` (`LogSink.write(record)`). Removes `LogDestination` and `logDestinationFor` (`logger.ts:45,60`) and the `this.otel !== undefined` branches.

**OBS-2. `metrics.ts` mixes a port, three adapters and listeners coupled to other libraries (high, M).** 263 lines with `MetricsPort`, `NoopMetrics`, `InMemoryMetrics`, `OtelMetrics`, and `resilienceMetricsListener` (:174, with a mirror interface `ResilienceMetricEvent` to avoid depending on resilience), `cacheErrorMetricsReporter` (:236), `recordCacheLookup` (:249) and `recordError` (:261). Observability knows about cache and resilience metrics, which is inverted coupling. Proposal: observability only has `MetricsPort`, `OtelMetrics`, `NoopMetrics` and `ErrorMetricAttributes`. `resilience` publishes a `ResilienceEventListener` that receives a `MetricsPort`; `cache` publishes `CacheMetrics`. Each library depends on observability, not the other way around. `InMemoryMetrics` goes to `test-utils` (T5).

**OBS-3. `telemetry.ts` with 337 lines and four responsibilities (medium, M).** `UuidV7TraceIdGenerator`, `ExternalTraceIdSpanProcessor`, `IovalkeyInstrumentation` and the `setupTelemetry` function (:243) plus `telemetryOptionsFromConfig` (:316) in one file. Proposal: one class per file and a `TelemetryBootstrap` (class with `start()` and `shutdown()`) that implements `OnApplicationShutdown`. `setupTelemetry` returns an object literal `Telemetry`; it becomes the `TelemetryBootstrap` itself. `ObservabilityModule.forRoot()` starts it with defaults from `AppConfig`. Today the service must call `setupTelemetry` in `main.ts` before importing anything, and the sub-entry `@platform/observability/setup` exists only for that.

**OBS-4. Functions in `trace.ts` and `propagation.ts` (low, S).** `isTraceId`, `normalizeTraceId`, `parseTraceparent`, `formatTraceparent`, `newTraceId`, `newSpanId` are pure formatting utilities, but `newTraceId` (`trace.ts:79`) creates a `new UuidV7IdGenerator()` as a default value (a shared instance in plain sight) and `newSpanId` (:84) uses `randomBytes`. They are grouped into `TraceContextCodec` and receive `IdGenerator`/`RandomSource`.

**OBS-5. Duplicated error metrics code (low, S).** `metrics.ts:204` (`errorMetricAttributes`) and `spans.ts:42` (`recordSpanError`) extract `code`/`name` from the error with similar logic, and `call-outcome.ts:102` (`reasonOf`) a third time. It goes to `ErrorDescriptor` (T7).

### 2.6 cache

840 lines. Well thought out; the seams are about wiring.

**CAC-1. `CacheAside` asks for too much wiring (high, M).** `cache-aside.ts:153` receives `CachePort`, `VersionedKeyspace` and an object with `resilience`, `transactions`, `singleFlight`, `random`, `onError`, `dependencyKey`, `maxValueBytes`. To use it you have to build a `ResilienceRegistry`, a `CacheTransactionScope`, a `VersionedKeyspace` and a `SingleFlight`. Proposal: `CacheModule.forRoot()` (by default `InMemoryCache` or `ValkeyCache` depending on config, with shared `SingleFlight` and `ResilienceRegistry`) and `CacheModule.forFeature({ namespace, ttlMs })` that registers a `CacheAside` ready to inject. `onError` becomes a `CacheErrorReporter` (port, with a metrics adapter), and `random`, `singleFlight` and `maxValueBytes` are removed from the public options (nobody changes them outside tests).

**CAC-2. Reimplements what primitives already has (medium, S).** `wait.ts` (78 lines) duplicates `raceDeadline` and `abortReason` (T3). `jittered-ttl.ts` replicates `boundedRandom` from `backoff.ts:54` (T4). `stable-hash.ts:58` has `isPlainObject`, which is also in `canonical-json.ts` and `value-object.ts`. Proposal: `stable-hash.ts` calls primitives' `CanonicalJson.digest` (the same canonical serialization) and is deleted.

**CAC-3. Invalidation with `afterCommit` as a callback (medium, S).** `InvalidateOptions.afterCommit?: (fn) => void` (`cache-aside.ts:94`) and `CacheTransactionScope.isInTransaction()` (:36) reinvent part of the `TransactionManager`. With an injected `TransactionManager` (which already exposes `afterCommit` and `isInTransaction`), `invalidate(namespace)` does both without the caller passing a function. `CacheTransactionScope` and `InvalidateOptions` are deleted.

**CAC-4. Loose functions and errors (low, S).** The script flags `jittered-ttl.ts`, `stable-hash.ts` and `wait.ts`. `jitteredTtl` → `TtlJitter` (class with `RandomSource`). `errors.ts` repeats five classes with the T2 pattern.

**CAC-5. `VersionedKeyspace` uses `randomUUID` directly (low, S).** `versioned-keyspace.ts:67,73,78` (T4): it receives `IdGenerator`.

### 2.7 bloom

681 lines. Self-contained and of good quality; there are three unused pieces.

**BLO-1. `BloomFilterDefinition.rebuildCron` and `resolveBloomFilterDefinition` have no consumer (high, S).** `bloom-filter-definition.ts:42,50` validate a cron expression that nobody schedules. Nothing rebuilds the filter. A `BloomRebuildJob` is needed (class with an injected `BloomFilterRegistry` and data source) inside the NestJS module, with a platform `JobScheduler` port that does not exist today. If the job scheduler is going to be `@nestjs/schedule`'s, `rebuildCron` is passed as is to the decorator; if not, the field is deleted. Today it is an option nobody uses.

**BLO-2. Loose functions (medium, S).** The script flags `bloom-filter-definition.ts`, `hashing.ts`, `limits.ts`, `optimal-parameters.ts`, `partitioned-bloom-filter.ts` and `positions.ts`. `murmur3_32` (a name with an underscore, against the naming convention), `bloomPositions`, `requiredBits`, `optimalParameters`, `partitionCount`, `partitionOf` and `assertIntegerInRange` become a `BloomMath` class (static and pure, justified) and `BloomSizing`. `partitionOf` also exists in `adapters/aws/messaging-names.ts:11` with a different meaning (ARN partition); rename the AWS one to `awsPartitionFor`.

**BLO-3. No module and no single entry point (medium, M).** To use a filter a service builds `BloomFilter`, or `ValkeyBloomFilter`, or `PartitionedBloomFilter`, depending on size. Proposal: `BloomModule.forFeature({ name, expectedItems, falsePositiveRate })` registers an `AsyncBloomFilter` with a token per name and picks the partitioned one if `expectedItems` requires it.

**BLO-4. Error names (low, S).** T8.

### 2.8 sharding

2,140 lines. Affected by the persistence decision, because the TypeORM sharding layer consumes it.

**SHD-1. `ShardRouter` does too much (high, L).** `shard-router.ts` has 733 lines, 14 private fields and a constructor with 12 options (`:264`). It mixes: resolution, a local LRU cache, a shared cache with versions and tombstones, an invalidation table with a sequence, deduplication of in-flight loads and publication of changes. Proposed collaborators, each with its own constructor:

- `ShardRouter` (only `resolve` and `assertWritable`),
- `PlacementCache` (local LRU plus shared `RoutingCache`, with tombstones and a minimum version),
- `InvalidationLog`,
- `PlacementLoader` (shared in-flight load with `LookupBudget`),
- `DirectoryChangeApplier`.
  Each must stay under 200 lines. The public API (`resolve`, `invalidate`, `applyDirectoryChange`) does not change, so persistence does not break.

**SHD-2. Loose configuration functions (medium, S).** The script flags `clock.ts`, `directory-changes.ts`, `lru-map.ts`, `placement-codec.ts`, `placement-policy.ts` and `sharding-feature.ts`. `nowMs(clock)` (`clock.ts:5`) is a one-line function used only in the router; it is deleted. `validateShardingFeature` and `routingKeyFor` (`sharding-feature.ts:26,48`) become `ShardingFeature` (an immutable class with `validate()` and `keyFor(context)`). `LruMap` is a general utility that only sharding uses: it moves to `primitives` as `LruCache` or stays as an internal class. `encodePlacement/decodePlacement` → `PlacementCodec` (class; today it uses a module-level `Set`, `placement-codec.ts`).

**SHD-3. `LookupBudget` duplicates wait with a deadline (medium, S).** T3. `lookup-budget.ts:4` copies `MAX_TIMER_MS`.

**SHD-4. Stale comments and documentation of something that does not exist (low, S).** `ports.ts:3` says the directory's Postgres belongs to `@platform/persistence`; it lives in `adapters/postgres`. `types.ts:12` documents `PersistenceModule.forFeature({ sharding: ... })`, which does not exist. The TypeORM decision will provide that module; until then the comment lies.

**SHD-5. Tenant constant with two values (medium, S).** `MAX_TENANT_ID_LENGTH = 64` in `shard-router.ts:45` and `128` in `internal-api/limits.ts:8` and `messaging/envelope/message-envelope.ts:30`. A 100-character tenant gets in through messaging and fails in the router. One constant in `kernel` (`TenantId` as a `ValueObject`).

**SHD-6. Ports with only an in-memory implementation or a single adapter (medium, M).** `DirectoryStore`/`DirectoryWriter`: Postgres (`adapters/postgres`) plus memory; `RoutingCache`: Valkey plus memory; `ShardDirectoryChangeSubscriber`/`Publisher`: Valkey Pub/Sub plus memory. They are really implemented. What is missing is the job that consumes `DirectoryWriter` (tenant onboarding and relocation are sagas nobody has written) and whoever calls `ShardRouter.applyDirectoryChange` at startup (subscription to `ValkeyShardDirectoryChannel` from `onModuleInit`). Proposal for the persistence team: `ShardingModule.forRoot()` connects channel, router and directory.

### 2.9 resilience

1,156 lines. Well made but with a single consumer.

**RES-1. `ResiliencePolicyName` is a closed enum with unused policies (high, S).** `policy-name.ts:2-10` fixes `Database`, `Cache`, `ExternalApi`, `Ai`, `AiStreaming`, `Email`, `Queue`, and `config.ts` ships values for all of them. Only `Cache` has a consumer. A service that needs another policy has to edit the library. Proposal: the name is a branded `string` or a token created with `ResiliencePolicy.named('payments')`; the library ships only `Cache` and `Database` by default; each module registers its own with `ResilienceModule.forFeature({ name, policy })`. `Ai`, `AiStreaming` and `Email` are deleted until there is an adapter.

**RES-2. `ResilienceRegistry` with 532 lines and shared mutable state (medium, M).** `registry.ts:153`: `configs`, `entries` and `listeners` in the same class that does `execute`, bulkhead, retries, per-attempt timeout and emission. It is split into `PolicyRegistry` (policy and entry resolution), `PolicyExecutor` (`runAttempts`, `runTimedAttempt`, `shouldRetry`) and `ResilienceEventBus` (listeners). `Bulkhead` and `CircuitBreaker` are already classes.

**RES-3. Loose functions and duplication (low, S).** `config.ts` and `transient.ts` are on the script's list: `retryAfterHintMs` (T2/PRM-2), `assertFinite`. `describeError` (`registry.ts:107`) repeated (T7). `registry.ts:176` and `:48` accept `random` (T4).

**RES-4. No wiring (medium, S).** T1. For `internal-api`, `aws` and Valkey to use it, a global `ResilienceModule` with `Database` and `Cache` must be exposed, plus an optional `@Resilient(policyName)` decorator (the previous audit saw it as obsolete code; if there is no decorator, `registry.execute` is documented as the only way).

### 2.10 messaging

3,129 lines. The most complete library; its two gaps are operational.

**MSG-1. Nobody runs the outbox relay or cleans the outbox (high, M).** `OutboxRelay.relayOnce` (`outbox-relay.ts:150`) processes a batch; in the whole repo only the documentation calls it (`outbox-message-bus.ts:29`: "for example `() => relay.relayOnce()`"). `PostgresOutboxStore.purge` and `PostgresIdempotencyStore.purgeCompleted` have no job either. Proposal: `OutboxRelayRunner` (class with a loop, `start()/stop()`, interval and `unref`, hooked to `onApplicationBootstrap/BeforeApplicationShutdown`), `OutboxRetentionJob` and `IdempotencyRetentionJob`. The runner wakes up with `OutboxMessageBus` (the `onAppended` that the service has to pass today) and with a fallback timer. Everything is registered with `MessagingModule.forRoot({ relay: true })`.

**MSG-2. Consumers are registered functions, not classes (high, M).** `MessageDispatcher.register(contract, handler)` (`message-dispatcher.ts:290`) receives a `MessageHandler<T>` closure. The skill asks for consumers as classes with `@Subscribe` in `presentation/`, with the use case injected. Today a service writes an `onModuleInit` that calls `dispatcher.register` by hand. Proposal: a `@Subscribe(UserRegisteredV1)` decorator on a method of an `@Injectable()` class, and a `MessagingExplorer` that discovers the methods with `DiscoveryService` and registers them in the dispatcher. The same for `TenantVerifier` (a function type, `message-dispatcher.ts:119`): it has no implementation. It becomes `abstract class TenantVerifier`.

**MSG-3. `MessageDispatcher` with 601 lines and three responsibilities (medium, M).** Envelope and limit validation, idempotency claim with a lease, and result classification in one class. Proposal: `EnvelopeValidator`, `ClaimGuard` (claim and release with `ProcessedMessageStore`), `DeliveryClassifier` (`classify-error.ts` becomes a class) and a `MessageDispatcher` that orchestrates them. The lease constants (`DEFAULT_CLAIM_LEASE_MS`, `assertLease` at `:235`) go to `ClaimGuard`.

**MSG-4. Second topology model (medium, M).** `topology/queue-def.ts`, `topic-def.ts`, `route.ts` and `retry-policy.ts` define `QueueDef`/`TopicDef`/`Route` with a chained API, and `contract-topology.ts` translates from contracts' `QueueDefinition`/`TopicDefinition`. Outside `contract-topology.ts` only the library itself uses them, with 36 uses in tests. It is an abstraction without a second use. Proposal: `Topology` is built directly from the kit's `*Definition`s (which already validate in `define-messaging.ts`) and the DSL is deleted. The validation in `topology.ts:169` (170 lines) and that of `defineQueue` overlap.

**MSG-5. Deprecated options and global state (medium, S).** `outbox-relay.ts:33-58` `LegacyBackoffOptions` marked `@deprecated` and accepted in `OutboxRelayOptions.backoff`. `message-envelope.ts:100-103` deprecated `newId` and `now` that "take precedence" over `ids` and `clock`. `message-envelope.ts:107-108` creates `defaultIds` and `defaultClock` as module singletons, and `createEnvelope` (:110), `parseEnvelope` (:166) and `toWireEnvelope` (:200) are functions. Proposal: `EnvelopeFactory` (receives `Clock` and `IdGenerator`) and `EnvelopeParser`; the two deprecated options and `LegacyBackoffOptions` are deleted.

**MSG-6. Clashes with what was decided and with the skill (medium, S).**

- The skill shows `OutboxWriter.add(events)` and `processed.tryRegister(id, consumer)`; the library uses `OutboxWriter.append(record)` (`outbox.ts:109`) and `ProcessedMessageStore = IdempotencyStore<ProcessedMessage>` with `claim/complete/release`. The library is more robust (fencing). The skill is updated, not the code.
- `OutboxWriter.append` "finds the transaction through its own `TransactionManager`" (`outbox.ts:106`): with TypeORM it will be the active transaction's `EntityManager`. Noted for the persistence team.

**MSG-7. Group constant and names (low, S).** `topology.ts:22` `MESSAGING_RESOURCE_NAME = /^[A-Za-z0-9_-]+$/` and `contracts/define-messaging.ts:82` `MESSAGING_NAME_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/`: two rules for the same name. The contracts one is used. `describe-error.ts` (4 lines) is `ErrorDescriptor` (T7).

**MSG-8. `InMemoryBus` and `InMemoryOutboxStore` in production (medium, S).** T5. `InMemoryBus.drain` (:124) is a testing tool.

### 2.11 internal-api

1,597 lines. Strong contract, reasonable size, but without a real transport and with manual wiring.

**INT-1. Only the in-process transport exists (high, L).** `Transport` (`transport.ts:20`) has a single implementation, `InProcessTransport` (`in-process-transport.ts:5`). For one service to call another you need `HttpTransport` (a client with `fetch`, `traceparent`, `CallMeta` in headers, validation against the contract before calling, `ExternalApi` resilience policy) and `InternalApiController` (the edge that exposes `InternalRouter.handle` at `/internal/v1/:operationId`, with service authentication). The security and composition skills take it for granted. Proposal: both pieces plus `InternalApiModule.forRoot({ transport: 'http' | 'in-process' })`.

**INT-2. `InternalClient` implements its own retry and has test seams as options (medium, M).** `client.ts:114`. The `sleep`, `random` and `clock` fields as options (`:46-53`) are test seams; the hand-rolled loop is replaced by `ResilienceRegistry` (T3). `client.ts:93` `isRetryable` and `:101` `defaultSleep` are loose functions. `InternalClient.call` (:137) and `callById` (:154) stay; building the attempts moves to `CallAttempt` (a small class).

**INT-3. `InternalRouter` with 537 lines and a hidden state machine (medium, M).** `router.ts:164`. It has `Stage` (:132), `Progress`, a `ROLLBACK` as a module symbol (:149) used to force the rollback by throwing an exception, and `traceContext` (:527). Proposal: `OperationDispatcher` (validation and routing), `IdempotencyGate` (claim, complete, release with the `ProcessedOperationStore`) and `UnitOfWorkRunner`. The `ROLLBACK` sentinel exception is replaced by a `Rollback` control flow class, or better by returning an `Outcome` and deciding the commit outside.

**INT-4. Imperative handler registration (medium, M).** `InternalRouter.register(operation, handler)` (:206) with closures. Same as MSG-2: `@InternalHandler(operation)` on injectable classes with automatic discovery. `assertComplete(registry)` (:203) runs automatically in `onApplicationBootstrap`.

**INT-5. Loose contract functions (medium, S).** The script flags `contract.ts`, `json-safety.ts`, `limits.ts` and `result.ts`. `effectiveRetry`, `effectiveTimeout`, `effectiveAttempts`, `defaultCallBudgetMs`, `compensationOf`, `allowedErrorCodes` (`contract.ts:63-134`) are methods of `OperationMetadata`, which today is an interface. It becomes an immutable class with those methods. `resolveOperation` uses a module-level `WeakMap` (:158). `limits.ts` (`operationIdempotencyKey`, `isValidCallKey`, `fitsPayload`) becomes `IdempotencyKeyPolicy` and `PayloadLimit`.

**INT-6. `DEFAULT_RETRY_POLICY` and `RetryPolicy` duplicate messaging and resilience (medium, S).** T3.

**INT-7. `ProcessedOperationStore` only has memory inside the library (low, S).** `store.ts:25`. The real adapter is `PostgresIdempotencyStore`, which complies. The in-memory one moves to `test-utils` (T5).

### 2.12 saga (already decided: clashes only)

The redesign (persistent store with TypeORM, `SagaInstance` as an aggregate, `StepExecutor`, `CompensationRunner`, `LeaseKeeper`, `SagaRecoveryJob`, `SagaEventPublisher`, `SagaModule.forFeature`) is already decided. What clashes with the current code and the saga team must keep in view:

- `engine/saga-engine.ts` (1,093 lines) is split among the collaborators. It has 30 private methods and an internal `Run`; `engine/transitions.ts` (217 lines) and `model.ts` (133) are functions and types that become methods of `SagaInstance`.
- `engine/engine-setup.ts` (`defaultBackoff`, `assertLeaseOutlivesStep`, `compileAll`, `callContext`), `engine/step-call.ts` and `util.ts` (`assertNever`, `jsonClone`, `copyDate`, `assertSerializableState`) are the loose-function modules that dissolve. `util.ts` is a name forbidden by the skill. `jsonClone` and `copyDate` only exist for the in-memory store; with TypeORM they disappear. `assertSerializableState` uses primitives' `CanonicalJson`.
- `store/in-memory-saga-store.ts` moves to `test-utils` (T5) and must pass the same contract test as the TypeORM store.
- `SagaRecoveryJob.runOnce` (`recovery/saga-recovery-job.ts:58`) is not scheduled anywhere: the module must do it.
- The `random`, `owner`, `leaseMs`, `maxStepDurationMs` options and the suspension ones (`engine-setup.ts:11-14`) move to the module configuration with defaults.
- `saga-engine.ts:85,107` defines `StartOptions` and `SagaSpanAttribute`; `engine/saga-engine.ts:1085` `inTrace` replicates `traceContext` from `internal-api/router.ts:527`. A single `TraceContextRestorer` in observability.
- `InternalClientInvoker` (`internal-client-invoker.ts`, 47 lines) and `OperationInvoker` (`invoker.ts`) adapt `InternalClient`: they will have to follow the new INT-2 API.
- The 1,670 lines of `engine/__tests__/saga-engine.spec.ts` are split along with the redesign.

### 2.13 rate-limit

555 lines. It is the library best aligned with the skills (abstract class as port, `test-utils`, `DegradingRateLimiter`). Two points.

**RTL-1. Loose rule and window functions (medium, S).** `rate-limit-rule.ts:61,90,119` (`assertRateLimitRule`, `assertRateLimitCall`, `defineRateLimitRule`) and `sliding-window.ts:31,68,112` (`windowPosition`, `admits`, `slidingWindowResult`). Proposal: `RateLimitRule` becomes an immutable class with `validate()` and `static define()`; `SlidingWindow` a class with the arithmetic (used by `InMemoryRateLimiter` and, by equivalence, by the Valkey Lua script, and a contract test must verify that they give the same result). Today the equivalence between memory and Lua has no test.

**RTL-2. No wiring (medium, S).** `RateLimitModule.forRoot()` picks `ValkeyRateLimiter` if Valkey is configured and wraps it in `DegradingRateLimiter` with `localDivisor` taken from `INSTANCE_COUNT`; otherwise, `InMemoryRateLimiter`. A `@RateLimit(rule)` plus `RateLimitGuard` covers usage in controllers. `onDegraded` becomes a `RateLimitDegradationReporter` that writes a log and a metric.

### 2.14 adapters/aws

1,033 lines. The only place with `@aws-sdk` (correct).

**AWS-1. No module, with manual factories and `destroy` (high, M).** `aws-clients.ts:19,29` `createAwsMessagingClients` and `destroyAwsMessagingClients`; `aws-config.ts:46` `awsConfig = defineConfig(...)` as a singleton on import. Proposal: `AwsModule.forRoot()` creates `SNSClient` and `SQSClient` with `AwsConfig` (tokens `SNS_CLIENT`, `SQS_CLIENT`), implements `OnModuleDestroy`, and registers `SnsSqsEnvelopePublisher`, `AwsMessagingNames` and `SnsSqsMessageBus` bound to messaging's `EnvelopePublisher` and `MessageBus` ports. With that, `MessagingModule` + `AwsModule` are enough to publish.

**AWS-2. `SqsDeliveryRunner` with 503 lines and two modes in one class (medium, M).** `sqs-delivery-runner.ts:161`. It has Lambda consumption (`handleLambdaEvent`, :189), long polling (`pollOnce`, `start`, `stop`, :234-311), DLQ forwarding (`sendToDeadLetter`, :401), the visibility change and the batch delete. Proposal: `SqsPoller` (service mode) and `SqsLambdaHandler` (Lambda mode) on top of a common `SqsDeliveryProcessor`, plus `SqsDeadLetterRedriver`. Its own `sleep` (:130, T3). The constants (`MAX_VISIBILITY_SECONDS`, `DEFAULT_BATCH_SIZE`, `DEFAULT_WAIT_TIME_SECONDS`) go to an `SqsConsumerConfig` with defaults.

**AWS-3. Loose functions (medium, S).** The script flags `aws-clients.ts`, `aws-errors.ts` (`isRetryableAwsError`, `transportError`), `elasticache-iam-auth.ts` (`credentialsOf`, `elastiCacheIamAuthToken`) and `messaging-names.ts` (`partitionOf`). Proposal: `AwsErrorTranslator` (class, registrable as a `FailureRule` in `FailureClassifier`, PRM-2), `ElastiCacheIamAuthTokenProvider` (class with `Clock` and the credentials through the constructor) and `partitionOf` as a private method of `AwsMessagingNames`. `elasticache-iam-auth.ts` belongs to the Valkey adapter by cohesion; it is what `valkey-client` consumes. Today `valkey` does not depend on `aws` and this is solved by passing the function; moving the class to `adapters/aws` is correct and `ValkeyModule` receives it through an optional token.

**AWS-4. Mixed layers in errors (low, S).** `aws-errors.ts` returns `MessagingError` with code `TransportFailed`: the adapter knows its port's error, which is fine. The validation messages in `aws-config.ts:23-44` are in Spanish and the rest of the code in English (T8).

### 2.15 adapters/valkey

1,202 lines.

**VLK-1. Factories and configuration through functions, without a module (high, M).** `valkey-client.ts:143,169` (`createValkeyClient`, `createTokenAuthenticatedValkeyClient`), `valkey-config.ts` (`valkeyConnectionFromConfig`, its own schema with 8 variables). No `quit()` on shutdown and no `HealthCheckable`. Proposal: `ValkeyModule.forRoot()` with `ValkeyClientFactory` (class), an `OnModuleDestroy` that does `quit`, a `ValkeyHealthIndicator`, and the adapters as providers: `ValkeyCache` bound to `CachePort`, `ValkeyRateLimiter` to `RateLimiter`, `ValkeyRoutingCache` to `RoutingCache`, `ValkeyShardDirectoryChannel`, `ValkeyBloomFilter`. With `VALKEY_URL` or `VALKEY_HOST` they all come up with defaults.

**VLK-2. `runCommand`, `integerReply`, `optionalStringReply` and `LuaScript` (medium, S).** `valkey-client.ts:42,84,92`. Functions that wrap the client: they become `ValkeyCommandExecutor` (a class with the client through the constructor, `run(command, args)`, `integer()`, `optionalString()`), which is already what each adapter uses separately. `bloom-keys.ts` (`bloomKey`, `rebuildKey`) and `valkey-error.ts` (private `errorMessage`, `valkeyError`) become methods of `ValkeyKeyspace` and `ValkeyErrorTranslator`.

**VLK-3. Mandatory prefix without a default (low, S, already noted in BE-02).** `ValkeyKeyspace` requires a prefix, which is correct because of the ACL; in the module, `VALKEY_KEY_PREFIX` should default to `SERVICE_NAME`, not force declaring it twice.

**VLK-4. Missing ports with a Valkey implementation (medium, M).** `IdempotencyStore` only has memory and Postgres. A `ValkeyIdempotencyStore` (with `SET NX PX` and the fencing token) would serve the internal API outside a transaction. It is a product decision; it is noted.

### 2.16 adapters/postgres (affected by what was decided)

1,149 lines. It really implements the outbox, processed messages, idempotency and the directory, which is why it is the critical piece. Everything below clashes with the TypeORM decision and is redone by that team:

- `shard-migrations.ts` (127) and `catalog-migrations.ts` (49) are hand-written SQL with `CREATE TABLE`, partial indexes and `CHECK`. They become entities (`OutboxEntity`, `IdempotencyKeyEntity`, `ProcessedMessageEntity`, `ShardDirectoryEntity`, `ShardInstanceEntity`, `ShardLockEntity`) and migrations generated with the CLI. `CLAIM_STATES_SQL`, `OUTBOX_STATUSES_SQL` and similar (`shard-migrations.ts:11-35`) generate the `CHECK` from the enums; with TypeORM, `@Check` or `enum` on `varchar` is used. The partial indexes (`outbox_open_idx` and the other three) are kept with `@Index({ where })`.
- The four stores (`postgres-outbox-store.ts` 353, `postgres-directory-store.ts` 330, `postgres-idempotency-store.ts` 244, `postgres-processed-message-store.ts` 40) use persistence's `Database`/`DatabaseResolver`/`SqlSession` and SQL with `$n`. They become `TypeOrmOutboxStore`, etc., on top of the active transaction's `EntityManager`. `FOR UPDATE SKIP LOCKED` and lease-based claiming are written with `QueryBuilder.setLock('pessimistic_write_or_fail')` or parameterized SQL in `manager.query`, justified by the skill.
- `PostgresProcessedMessageStore` inherits from `PostgresIdempotencyStore` (:23); this inheritance is not a stable hierarchy. With TypeORM, composition: a `ClaimTable<R>` that parameterizes the entity.
- Tests: `pg-mem` (`__tests__/utils/pg-mem.ts`) simulates Postgres. The skill says "do not mock what you do not own when you can run the real thing". The new layer is tested only with Testcontainers, and the contract tests (`outbox-contract.ts`, `idempotency-contract.ts`, `processed-message-contract.ts`) are kept because they are the useful ones.
- `postgres-outbox-store.ts:57-90` and `postgres-idempotency-store.ts:53` have repeated date conversion functions (`toDate`, `toMs`).

### 2.17 persistence (already decided: clashes only)

It is redone on top of TypeORM; the team must review these coupling points that other libraries assume today:

- `TransactionManager` and `IsolationLevel` exist in `primitives` and in `persistence/enums.ts`. The new layer implements the kernel port (PRM-1) and deletes the duplicated enum.
- `SqlUnitOfWork.session` (`transaction/transaction-manager.ts:13`) is what the stores use. With TypeORM it will be `manager: EntityManager`.
- `PersistenceContext` copies fields from `RequestContext` through a function (`persistence-context.ts:28`, `requestContextProvider` as a module constant); it becomes an injectable `PersistenceContextProvider` on top of `RequestContextStore` (OBS-1).
- `SessionSetting` (`app.actor_id`, `app.tenant_id`, `app.trace_id`), `@Audited` (`metadata/entity-metadata.ts:19`, with a module-level `WeakMap`) and the audit trigger (`schema-helpers.ts`, `persistence-migrations.ts`) are kept: they are the part that adds value and does not exist in TypeORM. `@Audited` switches to reading metadata with `Reflect` or with an `EntitySubscriber`, and the trigger is emitted in the migration.
- `persistence.ts:107` `createPersistence` (a factory function with two branches) becomes `PersistenceModule.forRoot` and `forFeature`.
- `base-repository.ts` (678 lines) and `database.ts` (417) disappear in favor of a `BaseRepository` on top of TypeORM, with the replica policy (`DatabaseRole`) and the `DataAccess` policy resolved by the shard's `DataSource`.
- `docs/adr/0009-rds-postgresql-in-house-persistence-layer.md` must be superseded by a new ADR. Its title and decision contradict what was agreed.
- `criteria` and `sharding/ports.ts`, `sharding/types.ts` (SHD-4, CRI-1) depend on this redesign.

### 2.18 contracts (kit and platform)

**CTR-1. The error catalog knows the whole platform (high, M).** T2. `platform-error-catalog.ts` (521 lines) and `platform-error-code.enum.ts` (108 lines, 100 values).

**CTR-2. `kit/define-*` as functions (medium, S, with an exception).** The script lists eleven kit files: `define-command`, `define-event`, `define-messaging`, `define-operation`, `define-route`, `define-service-contract`, `error-catalog`, `field-errors`, `message-definition`, `problem-details`, `query-params`, and `schemas/pagination.schema.ts`. These functions are a declarative DSL without dependencies or state that builds immutable descriptors; they are treated as a justified exception under "pure utilities" (section 3). The ones that must be classes because they have logic and state: `ErrorCatalog` (already one, :62), `validateContract` and the private `check*` in `define-service-contract.ts:63-183` (about 150 lines of verification) → `ServiceContractValidator`; `toProblemDetails` (`problem-details.ts`) → `ProblemDetailsFactory`, injectable in the error skill's `ProblemDetailsFilter`; `queryParamsOf` and `decodeQuery` in `query-params.ts` → `QueryParamsCodec`.

**CTR-3. Duplicated constants and patterns (medium, S).** `ERROR_CODE_PATTERN` (KRN-3), `MESSAGING_NAME_PATTERN` (MSG-7), `MAX_TENANT_ID_LENGTH` (SHD-5). One constant per concept, in `contracts/platform/constants`.

**CTR-4. `Date` without a clock in a validation (low, S).** `define-route.ts:91` validates deprecation dates with `new Date(...)`; that is parsing, not reading the clock, so it is fine. Not touched.

**CTR-5. `contracts/identity` (low, S).** 1,284 lines with the `contract.spec.ts` test that mixes checks; the 9 `if` statements in `contract.spec.ts` and the 8 in `platform-error-catalog.spec.ts` verify through loops (see section 3, tests).

### 2.19 shared/utils

**UTL-1. `money.ts` without a consumer and with loose functions (medium, S).** 106 lines (`money`, `addMoney`, `subtractMoney`, `multiplyMoney`, `sumMoney`, `allocateMoney`, `compareMoney`, `currencyDigits`, `formatMoney`) and the `@shared/utils` alias; nobody imports it (the type comes from `@contracts/platform`). It is a domain value object. Proposal: `Money` as a kernel `ValueObject` (`Money.of(amountMinor, currency)`, `.add()`, `.subtract()`, `.multiply()`, `.allocate(ratios)`, `.compareTo()`, `.format(locale)`) and `libs/shared/utils` is deleted. If it is not wanted in the kernel, it stays as `Money` in a `@platform/money` library, never as "utils" (a name the skill forbids).

### 2.20 tools

**TLS-1. `contracts-export` (778 lines) in functions and with manual registration (medium, M).**

- `build-export.ts`, `build-asyncapi.ts` and `build-topology.ts` are three function modules with a repeated `fail()` (`build-export.ts:32`, `build-topology.ts:25`, `define-service-contract.ts:105`).
- `main.ts` (117 lines) has `MODES` as a `Record`, `CONTRACTS_DIR = resolve('libs/contracts')` at module level (depends on the `cwd`), `console.log` and a `main()` with four responsibilities.
- `registry.ts:8` lists the contracts by hand, and `unregisteredDirs` (`main.ts:38`) forces you to remember to edit it.
  Proposal: `ContractExporter` (orchestrates, receives `ContractRegistry` and `FileSystem`), `SchemaExportBuilder`, `AsyncApiBuilder`, `TopologyBuilder`, `ExportCommand` with a `CheckMode` and a `WriteMode` (a strategy, not a dictionary of flags) and `ContractsDiscovery`, which reads `libs/contracts/*/src/index.ts` and avoids manual registration. `ContractExporter` writes through an `ArtifactWriter` so it can be tested without disk.

**TLS-2. `app-bundler` is fine (low, S).** `AppBundler` and `DecoratorMetadataPlugin` are already classes with a constructor. Only `main.ts` is a script with `console`; that is fine in a command-line binary. The plugin recommends `types: ["*"]` and `emitDecoratorMetadata` consistent with the rest (verified). An app and module generator is missing, announced in CLAUDE.md as "phase F11".

---

## 3. Reasonable exceptions (not touched)

To avoid over-applying the "no loose functions" rule, these stay as they are:

- Declarative factories without state or dependencies: `defineEvent`, `defineCommand`, `defineOperation`, `defineRoute`, `defineTopic`, `defineQueue`, `defineServiceContract`, `defineErrorCatalog`, and the zod schemas in `env.ts` and `secret()`. They are a contract DSL.
- Pure formatting or math functions without configuration that are already grouped in a cohesive file (`fnv1a32`, `murmur3_32`): they are wrapped as static methods of a utility class with a business name (`Hashes`, `BloomMath`), without injection.
- The `main()` functions of the `tools/` binaries.

---

## 4. Tests (section 7 of the request)

- **Verification of internal details.** `shard-router.spec.ts` (1,339 lines) has 56 `jest.fn` and 45 `toHaveBeenCalledTimes/With` assertions on the directory and the shared cache; `cache-aside.spec.ts` (794 lines) 54 and 25; `internal-api/router.spec.ts` 38 and 17; `client.spec.ts` 17 and 16. They count internal calls, which is what the skill forbids ("neither the order nor the number of internal calls is verified"). They are replaced by fakes with behavior (`InMemoryDirectoryStore` with an observable counter as a public attribute of the fake) and the external result is verified (which shard it reached, how many times the source of truth was read only when that is a requirement, such as load deduplication).
- **Logic in tests.** `adapters/aws/src/__tests__/sqs-delivery-runner.spec.ts` (14 `if`), `sns-sqs.integration.spec.ts` (:172-177, :320-325) with an `if (name === 'GetQueueUrlCommand')` ladder that reimplements the SDK; `sharding/consistent-hash-ring.spec.ts` (9), `saga-engine.spec.ts` (9), `contracts/identity/contract.spec.ts` (9), `platform-error-catalog.spec.ts` (8). Proposal: a `FakeSqsClient` and a `FakeSnsClient` as classes in `adapters/aws/src/__tests__/utils/` (today there is only `fixtures.ts`) and `it.each` for the tables.
- **Huge files.** `saga-engine.spec.ts` 1,670 lines, `shard-router.spec.ts` 1,339, `router.spec.ts` 909, `define.spec.ts` 795. They are split by scenario along with the refactor of each class.
- **`pg-mem` instead of a container.** T6 and 2.16.
- **Fakes without a contract test.** There is only a shared contract for Postgres outbox, idempotency and processed messages. Missing for `RateLimiter` (memory versus Valkey), `CachePort` (memory versus Valkey), `DirectoryStore`, `RoutingCache` and `SagaStore`.
- **Integration with another name and scope.** T9.

---

## 5. Table of ports and who really implements them

| Port                               | Memory     | Real           | Missing                                                          |
| ---------------------------------- | ---------- | -------------- | ---------------------------------------------------------------- |
| `OutboxStore`                      | yes        | Postgres       | job that runs `OutboxRelay` and cleans up (MSG-1)                |
| `EnvelopePublisher`                | no         | SNS/SQS        | nothing                                                          |
| `ProcessedMessageStore`            | yes        | Postgres       | nothing; `TenantVerifier` without an implementation (MSG-2)      |
| `IdempotencyStore`                 | yes        | Postgres       | optional Valkey (VLK-4), purge job                               |
| `DirectoryStore`/`DirectoryWriter` | yes        | Postgres       | who writes (onboarding and relocation sagas), subscriber startup |
| `RoutingCache`                     | yes        | Valkey         | nothing                                                          |
| `ShardDirectoryChange*`            | yes        | Valkey Pub/Sub | subscription in `onModuleInit`                                   |
| `Transport` (internal-api)         | in-process | none           | `HttpTransport` and the inbound controller (INT-1)               |
| `SagaStore`                        | yes        | none           | decided: TypeORM                                                 |
| `CachePort`                        | yes        | Valkey         | nothing                                                          |
| `RateLimiter`                      | yes        | Valkey         | nothing                                                          |
| `AsyncBloomFilter`                 | yes        | Valkey         | rebuild job (BLO-1)                                              |
| `LoggerPort`                       | console    | OTLP           | nothing                                                          |
| `MetricsPort`                      | yes        | OTLP           | nothing                                                          |
| `Clock`/`IdGenerator`              | yes        | yes            | `RandomSource` (T4)                                              |
| secrets                            | no         | no             | `SecretsProvider` with Secrets Manager (CFG-5)                   |
| health                             | no         | no             | `HealthCheckable` in each adapter (T1)                           |

---

## 6. Plan by work package

Each package touches a set of files disjoint from the rest. Packages P1 to P6 can run in parallel once P0 is closed. PD1 and PD2 are what was already decided; they are listed to fix the file boundaries.

Common rule: the `tsconfig.base.json` aliases and the `package.json` dependencies are edited only by P0 (it adds the `@platform/<lib>/nest` and `@platform/<lib>/test-utils` aliases for all libraries, and `@nestjs/common`, `@nestjs/core`, `@nestjs/testing`, `typeorm`, `reflect-metadata`). No other package touches those two files. The public API of the libraries does not change names until the owning package announces it in its `index.ts`; the other packages import only what already exists.

### P0. Foundations (first, sequential, team of 1 to 2 agents)

Files: `libs/platform/kernel/**`, `libs/platform/primitives/**`, `libs/contracts/platform/src/enums/platform-error-code.enum.ts`, `libs/contracts/platform/src/errors/**`, `libs/contracts/platform/src/kit/error-catalog.ts`, `tsconfig.base.json`, `package.json`, `jest.preset.js`.

Content: KRN-1 to KRN-4, PRM-1 to PRM-3, T2 (splitting enums and catalogs per library, leaving `PlatformErrorCode` cross-cutting), T4 (`RandomSource`), T7 (`Guard`, `ErrorDescriptor`), T6 (`ContainerRuntime` in `kernel/__tests__/utils`), `HealthCheckable`, base tokens (`CLOCK`, `ID_GENERATOR`, `RANDOM_SOURCE`), transaction and idempotency ports moved to the kernel, and everyone's aliases and dependencies. Total effort L. Afterwards each library only needs to change its imports; P0 leaves compatibility aliases (re-exports) for one cycle so the following packages are not blocked.

### P1. Config and observability

Files: `libs/platform/config/**`, `libs/platform/observability/**`.

Content: CFG-1 to CFG-5, OBS-1 to OBS-5, T1 for both (`ConfigModule`, `ObservabilityModule`, `RequestContextInterceptor`). Move `LogLevel` to observability. Take the resilience and cache listeners out of `metrics.ts`; P2 adopts them. Effort L. Depends on P0.

### P2. Resilience, cache, rate-limit and bloom

Files: `libs/platform/resilience/**`, `libs/platform/cache/**`, `libs/platform/rate-limit/**`, `libs/platform/bloom/**`.

Content: RES-1 to RES-4, CAC-1 to CAC-5, RTL-1 and RTL-2, BLO-1 to BLO-4, T3 (delete `wait.ts`), the `ResilienceModule`, `CacheModule`, `RateLimitModule`, `BloomModule` modules, and the metrics listeners that came out of observability. Effort L. Depends on P0, and on P1 only for the `MetricsPort` (which does not change shape).

### P3. Messaging and AWS adapter

Files: `libs/platform/messaging/**`, `libs/platform/adapters/aws/**`.

Content: MSG-1 to MSG-8, AWS-1 to AWS-4, T5 (for its doubles), T6 (its integration with `ContainerRuntime`), `MessagingModule`, `AwsModule`, `@Subscribe`, `OutboxRelayRunner` and retention jobs, splitting the SQS runner. `adapters/aws` keeps `elasticache-iam-auth` until P5 consumes it through a token. Effort L. Depends on P0 and P1.

### P4. Internal API

Files: `libs/platform/internal-api/**`.

Content: INT-1 to INT-7, `InternalApiModule`, `HttpTransport`, inbound controller, `@InternalHandler` decorator. It must keep the shape of `InternalClient.call/callById` and of `OperationInvoker`, because PD2 consumes them. Effort L. Depends on P0, P1 and P2 (resilience).

### P5. Sharding and Valkey adapter

Files: `libs/platform/sharding/**`, `libs/platform/adapters/valkey/**`.

Content: SHD-1 to SHD-6, VLK-1 to VLK-4, T3 (delete `LookupBudget`), `ShardingModule` (without the TypeORM part), `ValkeyModule`, `ValkeyHealthIndicator`. The public API of `ShardRouter` does not change; PD1 consumes it. Effort L. Depends on P0 and P2 (cache, bloom, rate-limit).

### P6. Contracts, tools and utilities

Files: `libs/contracts/platform/src/kit/**` (except `error-catalog.ts`), `libs/contracts/platform/src/{schemas,constants,types,contract.ts,index.ts}`, `libs/contracts/identity/**`, `libs/shared/utils/**` (deleted), `tools/**`.

Content: CTR-2, CTR-3, CTR-5, UTL-1 (`Money` to the kernel: coordinate with P0 on the `kernel/src/money.ts` file that P0 creates empty with the agreed contract, or ask P0 to include it), TLS-1 and TLS-2, and the app and module generator (F11) if desired. Effort M. Depends on P0 (for the catalog split).

### PD1. Persistence with TypeORM and physical sharding (already decided)

Files: `libs/platform/persistence/**`, `libs/platform/adapters/postgres/**`, `libs/platform/criteria/**`, `docs/adr/0009-*.md` (superseded by a new ADR).

Content: what was decided, plus CRI-1 to CRI-4, 2.16 and 2.17. It consumes `ShardRouter` from P5 and the kernel ports from P0. It must start after P0 moves `TransactionManager` and after P5 closes the router split (or work against the public API, which does not change). Effort L.

### PD2. Sagas (already decided)

Files: `libs/platform/saga/**`.

Content: what was decided, plus the notes in 2.12. It consumes `InternalClient` from P4 and `PersistenceModule`/`EntityManager` from PD1. Effort L. Depends on P0, P4 and PD1.

### Suggested order

1. P0 alone.
2. P1, P2 and P6 in parallel.
3. P3, P4 and P5 in parallel (each one needs P1 and P2).
4. PD1 (after P0 and P5) and then PD2 (after P4 and PD1).

Each package closes with `pnpm nx run-many -t lint test typecheck -p <package projects>` and with `node .claude/skills/backend-structure/scripts/check-structure.mjs --all .`, whose goal is to go down from 97 to the exceptions in section 3 (about 12, all from the contract DSL and the `main()` functions in `tools`).
