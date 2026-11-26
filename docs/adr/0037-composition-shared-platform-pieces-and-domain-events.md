# 0037. Composition, shared platform pieces and domain events

- Status: Accepted
- Date: 2026-11-25
- Related: [ADR 0024](0024-typeorm-persistence-sharding-persistent-sagas.md), [ADR 0025](0025-nestjs-layer-per-sub-entry-abstract-ports.md), [ADR 0033](0033-generators-and-openapi.md)
- Amends: ADR 0024 on the repository base

## Context

The general review of 2026-11-24 found that the services had grown their own copies of the same pieces and that the reference service did not follow the composition rules it is meant to teach:

- The helper that opens a tenant's shard and sets `app.tenant_id` for RLS was copied into five services, as an `@Injectable` inside `shared/utils`.
- Four classes answered "who is acting" in four ways, cursors were built in three shapes with a `new CursorCodec()` inside each class, and five integration test apps repeated about 650 lines.
- Two repository bases coexisted: `ShardedRepository` with `Criteria` and `PageBuilder`, named by ADR 0024 but used by no service, and `TenantIsolatedRepository`, used by every repository.
- Adapters were chosen with a `switch` inside a NestJS `useFactory`, use cases read `AppConfig.root<X>()`, library modules registered their own `Clock` and `IdGenerator` over the process ones, and several classes built a `new SystemClock()` when none was passed.
- The tenant move ports and its application layer took TypeORM `DataSource`s.
- The fifteen identity business modules were `@Global()`, and the access grant source looked up `AccessFacade` through `ModuleRef` to get around a cycle. Not one aggregate raised a domain event, although the domain skill required it.

## Decision

### Shared pieces live in the platform

- `ShardScopes` in `@platform/persistence` opens a tenant's shard (`inTenantShard`, which also sets the tenant of the request context) or a user's shard (`inUserShard`). `PersistenceModule` provides it.
- `ActingMember` (a person or a service account working on a tenant) and `ActingUser` (a route that needs a user session) in `@platform/auth` are the only way a controller reads who is acting.
- `IdCursor` in `@platform/criteria` writes and reads id cursors over the injected `CursorCodec`. `CriteriaModule` (`@platform/criteria/nest`) provides both once per process; a service with other cursor shapes builds them on the injected codec.
- `ServiceTestApp` in `@platform/service/test-utils` starts a whole service over real PostgreSQL and Valkey: databases, identity stub, peer stubs, migrations, tenant placement and HTTP. Each service's test app composes one and adds only what is its own, so their public methods did not change.

### One repository base

`TenantIsolatedRepository` is the base of every tenant repository: the tenant comes from the `ShardScope` the use case opened, every query filters by it and RLS fails closed without it. `ShardedRepository`, `CatalogRepository`, `TypeOrmCriteriaTranslator`, `CriteriaFieldMap` and the `Criteria` query language are removed. Pages are keyset pages written by each repository, with `IdCursor` or a cursor of the service built on `CursorCodec`. The `PLATFORM.CRITERIA.*` error codes stay in the contract.

### Dependency injection

- An adapter is picked by a selector class with its own tests (`EmailSenderSelector`, `PaymentProviderSelector`, `ReportResultStoreSelector`, `IdentityMailerSelector`), as `FlagStoreSelector` already did. The `useFactory` only calls it.
- A service reads its own variables through a `RootSettings<T>` subclass in its `config/` folder (`BillingSettings`, `ReportsSettings` and so on). Use cases and adapters inject it and never call `AppConfig.root<X>()`; only composition code that receives `AppConfig` from a platform module option (such as the real-time `serveConnections` callback) still reads the root.
- `KernelModule` (`@platform/kernel/nest`) is the only provider of `Clock`, `RandomSource` and `IdGenerator`. It is global and imported once at the root; no library module registers its own, and none injects `Clock` as optional with a `SystemClock` fallback.
- A class receives its clock, randomness and id generator; none builds a default one. The composition roots that run before NestJS (the telemetry bootstrap and the migration generator command) are the exception.
- No class builds a collaborator with `new` when the caller passes none. Every collaborator is a required constructor argument, provided by its library's Nest module and by tests through class doubles: `CacheAside` receives its `CacheTransactions` and `CacheErrorReporter` (`CacheModule` provides `NoTransactionScope` and `NoopCacheErrorReporter`), `DegradingRateLimiter` its fallback limiter and reporter, `MessageDispatcher` its tracing, trace restorer and failure classifier, `OutboundMessageFactory` its trace restorer (passed by `OutboxMessageBus` and `SnsSqsMessageBus`), `ContractRegistry` its resolver and JSON-safety checker, `DirectoryTenantPlacement` its `TenantPlacer`, and `ShardRouter` its strategy (`ShardingModule` provides `ConsistentHashStrategy`). `ResilienceRegistry` receives its event bus, policies and executor, which `ResilienceRegistryFactory` builds over one shared bus.
- `FailureClassifier` and `MetricsPort` are required providers. A service gets the `PlatformFailureClassifier` from `PlatformRuntimeModule` and the metrics from `ObservabilityModule`; a library test module registers its own. The `MessagingModule`, `InternalApiModule` and `SagaModule` factories inject the classifier, and `SchedulingModule` rejects a definition without `metrics` as it does without `logger`.
- Selectors and factories whose job is to build are the only exception. Building the adapter it picks, such as `TenantDataTransferSelector` building `BatchTenantDataTransfer`, or the object graph it assembles, such as `ResilienceRegistryFactory`, is their job, so their own collaborators come through their constructor.
- A module that creates an SDK client owns it and destroys it on shutdown. `AwsModule` provides the SES client and `SesEmailClient` next to the SNS and SQS clients, and notifications' `EmailSenderSelector` receives `SesEmailClient` instead of building one.
- The tenant move ports and its application layer speak in shard locations and name no TypeORM type. `ShardConnections`, `PooledShardConnections` and `ConnectedTransfer` live in `transfer/typeorm`, off the public index, and the batch copy translates a foreign key violation on the target into a `RoundPending` `TenantMoveError`, so `TenantMoves` imports nothing from the Postgres adapter.

### Composition of a service

- **`@Global()` is not the rule for business modules.** A business module imports the modules whose facades it uses. Only platform modules and a service's infrastructure modules that hold no business rules (identity's secrets, ephemeral store, sign-in delivery and auth support) are global. A service's `shared/` folder holds only enums, constants, types and pure utilities; an injectable shared by several modules lives in an infrastructure folder of the service, such as identity's `sign-in/`.
- **Core and entry modules.** When the facades of a service form cycles between modules, each module caught in a cycle is split in two: `<Name>CoreModule` holds the facade and what it needs, with the repositories, and exports them; `<Name>Module` holds the controllers, consumers, jobs, internal operations and the use cases no other module calls, and imports its core and the modules it uses. Core modules only import other core modules (and modules without business dependencies, such as identity's alerts), so their import graph has no cycles. A module that does not close a cycle stays whole.
- **`module.ts` next to `index.ts`.** A module that others import exposes its Nest module classes in `modules/<name>/module.ts`; `index.ts` keeps the facades and types. Loading a facade then never loads a module graph, which would otherwise evaluate a module class before the class it imports is defined.
- **No `ModuleRef` lookups and no `forwardRef`.** A dependency is either imported or the design is changed.
- **A module does not reach into another module's repositories.** It asks the other module's facade.

Identity applies this with core modules for access, tenants, users, passwords, passkeys, devices and tenant moves, and `IdentityAccessGrantsModule` gives `AuthModule` the access grant source with `AccessFacade` injected through the constructor; a test discovers every module under `modules/*/presentation` and checks that none is global and that core modules only import core modules, so a new module is checked without being listed. Billing, notifications, reports and tasks had no cycles: their modules stopped being global and import the modules they use, and notifications' privacy handler erases deliveries through `DispatchFacade` instead of the dispatch repository.

### Domain events

A domain without events is allowed. The rule is that a fact leaves the service through `MessageBus` from the use case, in the same transaction as the change, translated by an application mapper to the versioned event of `@contracts/<service>`. An aggregate raises a domain event with `addDomainEvent` only when its own state decides which fact happened and the use case would otherwise have to repeat that decision; the use case then takes it with `pullDomainEvents()` after saving. The backend skills say this instead of requiring events on every aggregate.

### CI

`check-structure` (backend and front) and `generators:verify` run in the CI `nx` job. The backend test step passes `--coverage` to `nx affected -t test`; the `nx:run-commands` executor of the inferred `test` target forwards it to Jest (`> jest --coverage ...` in the task log), so the thresholds of `backend/jest.preset.js` fail the job.

## Consequences

### Positive

- A fix to the shard helper, the acting actor or a cursor lands once and reaches every service.
- A new service copies identity's composition without carrying hidden global dependencies or a service locator.
- A test controls time through the constructor of the class under test, and the process has one clock.

### Costs

- Identity has more module files: a core module next to each module caught in a cycle.
- Library modules no longer compile on their own in a test without `KernelModule`.
- A repository that wants dynamic filters writes its query by hand; there is no generic criteria language.
