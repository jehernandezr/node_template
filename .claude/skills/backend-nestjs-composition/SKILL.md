---
name: backend-nestjs-composition
description: 'NestJS composition: modules as composition root, port tokens, use cases, controllers, facades and shutdown. Use it when wiring modules and providers.'
paths:
  - 'backend/**/presentation/**'
  - 'backend/**/*.module.ts'
  - 'backend/**/main.ts'
  - 'backend/libs/platform/*/src/nest/**'
  - 'backend/libs/platform/http/**'
  - 'backend/libs/platform/service/**'
---

# Composition with NestJS

NestJS is a detail of `presentation/` and of the composition root. The domain and the use cases do not know it exists.

## Module = composition root

- One module per business module, in `presentation/<name>.module.ts`. It is the only place that binds a port to its adapter.
- `providers` lists use cases, adapters and services. `exports` lists only the facade and the tokens other modules may use.
- Modules import modules, never loose providers from another module. No `forwardRef`: a circular dependency is a design error, solved with an event or by moving the responsibility.
- `@Global()` only for platform (config, logger, clock). Never for business.
- Providers use the default scope (singleton). `Scope.REQUEST` is forbidden in business code: it hurts performance and lifecycle hooks do not run. The request context (tenant, trace) lives in the platform `AsyncLocalStorage`.

## Tokens for ports

Every port is an abstract class without decorators: it is both the contract and the injection token, and it is injected by type, without `@Inject`. The domain does not import NestJS.

```ts
export abstract class UserRepository {
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract save(user: User): Promise<void>;
}
```

Example in `references/examples.md`, section "Tokens for ports".

A `Symbol` only when several instances of the same type coexist: `SNS_CLIENT`, `SQS_CLIENT` or a Bloom filter by name with `bloomFilterToken(name)`. There the constructor takes `@Inject`:

Example in `references/examples.md`, section "Tokens for ports".

- Loose string tokens are forbidden. `Symbol` tokens are exported from a single file, next to the port.
- `useFactory` with `inject` when the adapter needs configuration or an async client. The factory only assembles, it has no logic.
- `Clock`, `IdGenerator`, `RandomSource` and `TransactionManager` from the kernel and `LoggerPort` from observability are abstract classes: they are injected by type, without `@Inject`.
- `useExisting` for an alias (one concrete class that fulfills two ports).
- `@Inject()` and `@Injectable()` only in `infrastructure/`, `application/` (use cases) and `presentation/`. The domain never has them.
- A use case has `@Injectable()`; it is the only framework annotation tolerated in `application/`.

## Platform library modules

- Every library with wiring exposes `@platform/<lib>/nest`. Its module is imported with `forRoot` or `forRootAsync` (generated with `ConfigurableModuleBuilder`) and with `forFeature` when the service registers something of its own.
- `ConfigModule.forRoot({ schema })` receives only the service schema. Each library module imports `ConfigModule.forFeature(section)` with its `ConfigSection`, so the service does not know other modules' variables.
- The service picks the adapter by passing its type in the option (`CacheModule.forRoot({ store: ValkeyCache })`). A core module never imports an adapter. Without the option you get local mode (`InMemoryCache`).

```ts
export interface CacheModuleOptions {
  /** Defaults to `InMemoryCache`, the local mode without Valkey. */
  readonly store?: Type<CachePort>;
}
// in CacheModule: { provide: CachePort, useExisting: options.store ?? InMemoryCache }
```

Example in `references/examples.md`, section "Platform library modules".

Without Valkey (local mode with a single instance), the service omits `ValkeyModule` and leaves `CacheModule.forRoot()` and `RateLimitModule.forRoot()` without options: they use `InMemoryCache` and `InMemoryRateLimiter`, and `ShardingModule` uses `NullRoutingCache` and `InProcessDirectoryChannel`. Exclusive jobs use `InProcessJobLock`.

Catalog of each module (what it provides and its hooks) in `references/platform-modules.md`.

## Use cases and commands

- One class per use case, method `execute(command)`, verb name (`SignInUseCase`). It implements `UseCase<TInput, TOutput>` from the kernel.
- It orchestrates: checks permissions, loads aggregates, calls the domain, saves, publishes events with `MessageBus`, returns a minimal DTO (an id or a result, not the aggregate).
- It contains no business rules. If a condition decides business behavior, it goes in the aggregate or in a domain service.
- A use case does not call another use case. If two share a step, it is an application service or an event.
- The command is an immutable data class in `application/`, separate from the HTTP DTO. The controller translates one into the other.
- Queries (reads) have their own `*Query` class and handler, and do not open a write transaction.
- The use case opens the transaction with `TransactionManager.runInTransaction`. Never the controller.

Example in `references/examples.md`, section "Use cases and commands".

## Controllers and consumers

- Thin: they validate input with the contract zod schema, build the command, call the use case, build the response. No rules, no repository access, no business `try/catch`.
- Validation uses a platform `ZodValidationPipe` with the schema from `@contracts/<service>`. The schema is not duplicated with `class-validator`.
- The response is built explicitly with the allowed fields (allowlist). Never return an ORM entity or an aggregate.
- One controller per trigger type: HTTP, message (`@Subscribe`), job.
- Errors are not caught here. The global filter translates them (see `backend-errors`).
- Authorization through a guard and a decorator with a permissions enum (see `backend-security`).
- Consumers are classes with `@Subscribe` methods and internal API handlers are classes with `@InternalHandler`; `MessagingExplorer` and `InternalApiModule` discover them, they are not registered by hand.
- Periodic tasks are providers that extend `ScheduledJob`; `SchedulingModule` discovers them without the business module importing it.

## Facades

A module talks to another through its facade (`UsersFacade`) or through events. The facade exposes small methods with their own DTOs, not aggregates or entities. If the other module lives in another service, it is an internal API client with a contract.

## Lifecycle and shutdown

- `main.ts` first imports `./instrumentation.js`, which calls `TelemetryBootstrap.start(process.env)` from `@platform/observability/setup`, and then creates the app with NestJS and calls `app.enableShutdownHooks()`.
- Nest 12 shuts down in this order: all `onModuleDestroy`, then `beforeApplicationShutdown` and finally `onApplicationShutdown`. That is why whatever generates work (`JobRunner`, `SqsPoller`, subscriptions) stops in `onModuleDestroy`, and the modules that close resources (SNS and SQS clients, Valkey with `quit`, `DataSource`) are global and imported earlier in `AppModule`, so their `onModuleDestroy` runs later: Nest destroys modules in reverse import order. `SqsPoller` lives in `SqsConsumerModule`, which is not global, so it closes before `AwsModule`, which only implements `OnModuleDestroy`. `onApplicationShutdown` flushes telemetry.
- `onApplicationBootstrap` runs once all modules have initialized: cross validations go there (`InternalApiModule` calls `assertComplete`, `MessagingExplorer` registers the consumers).
- Health is gathered by `HealthRegistry` from observability: each network adapter implements `HealthCheckable` from the kernel and registers itself in its `onModuleInit`.
- Startup hooks are async and fail loudly: if the config or the database is missing, the process does not start.
- `app.close()` does not end the process: no dangling timers.
- A module does no work when its file is imported. Everything happens in hooks.

## Startup check

```
- [ ] Every injected port has its provider in the module or in its library module
- [ ] Adapters are passed as a type in the options of each library module
- [ ] No business provider is global or request scoped
- [ ] exports only with the facade and public tokens
- [ ] enableShutdownHooks enabled
- [ ] The app starts with NEST_DEBUG=true with no unresolved dependencies
```

## With pstack

Method in `pstack-in-node-template`. From pstack these apply here: `principle-boundary-discipline`, `principle-minimize-reader-load`, `principle-laziness-protocol`, `principle-encode-lessons-in-structure`. An adapter is picked with a tested selector class, never with a `switch` inside `useFactory`.
