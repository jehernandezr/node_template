<!-- Exported copy of the Claude Docs document https://claude.ai/artifact/Bn67Z4R16bLoevfodCcHiT (revision 113), taken on November 14, 2026 before it was cut down to an executive summary. It is a historical archive: the source of truth for the plan is docs/plan/README.md. The export replaced the two embedded diagrams (routing of a query and roadmap) with placeholder text; both exist as mermaid in docs/ARCHITECTURE.md and in docs/plan/README.md. -->

# Backend platform: architecture plan

Nov 11, 2026 · @Jonatan

## Summary

The platform is a reusable monorepo for building microservice backends in NestJS with TypeORM, hexagonal architecture and deployment on AWS. It replaces the `node_template` repository and serves as the starting point for any new product: you clone it, rename it and add services with a generator.

It comes with what every backend needs and is almost never done right from the start already solved: identity with MFA, multitenancy, auditing, messaging with retries, recoverable sagas, files, notifications, usage-based billing and end-to-end traceability.

**Principles that guide every decision**

- **Strict hexagonal.** The domain and the use cases know nothing about NestJS, TypeORM or AWS. Everything external comes in through ports.
- **Platform agnostic.** Migrating from AWS to another provider means rewriting adapters, never business logic.
- **Types before strings.** Operations, events, queues, permissions, errors and jobs are named with enums. The compiler catches a rename.
- **Explicit contracts.** Each service publishes what it exposes (operations, events, errors) with runtime validation on both sides.
- **Everything leaves a trace.** Every request, message, saga step and table change is tied to a `traceId` and to an actor.
- **Secure by default.** Every endpoint requires authentication unless it is declared public, and every operation that modifies data declares how it is reverted.

## Starting point

[`jehernandezr/node_template`](https://github.com/jehernandezr/node_template) is an Express app with Sequelize from January 2022 (9 commits). The new platform is written from scratch and keeps the original idea: auth with JWT, roles and centralized error handling.

These findings are fixed as part of the initial step:

| Finding                                                                                                                          | File                                         | Action                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `.env` committed with `JWT_SECRET` and the database password                                                                     | `.env`                                       | Remove it from the history, rotate those values if they were used anywhere else and publish `.env.example` |
| Database and login credentials printed to the console                                                                            | `utils/dbConnection.ts`, `authMiddleware.ts` | Logger with automatic redaction of sensitive fields                                                        |
| Signup accepts `role` from the body (anyone can register as admin)                                                               | `authMiddleware.ts`                          | Roles assigned only by the system or by an admin                                                           |
| Login reads `user.password` before checking that the user exists                                                                 | `authMiddleware.ts`                          | Uniform 401 response for an invalid user or password                                                       |
| `updatePassword` swaps the bcrypt arguments and stores the new password unhashed                                                 | `authMiddleware.ts`                          | Password change flow with argon2id and session revocation                                                  |
| `catchAsync` import against the file `CatchAsync.ts` (compiles on macOS, fails on Linux)                                         | controllers                                  | Lint for case-sensitive paths                                                                              |
| `sync({ alter: true })` at startup                                                                                               | `server.ts`                                  | Versioned migrations, `synchronize` always off                                                             |
| The error handler calls `render('error')` without a view engine and leaves the request hanging if `NODE_ENV` has any other value | `errorController.ts`                         | Global filter with RFC 9457 format                                                                         |

## Monorepo with Nx

The repository root is minimal (ADR 0015). It contains two applications, `backend/` and `front/`, Nx as the orchestrator and the repository tooling. Each application owns its libraries: nothing shared between backend and front lives at the root, and the front receives the contracts generated from the backend.

The backend uses pnpm with a single `node_modules`, at the root. The libraries are Nx projects without a `package.json`, they are imported through TypeScript aliases (`@platform/kernel`) and they are not compiled separately: only the apps are bundled with esbuild into `backend/dist/<app>`. The code goes directly in `src/`, the tests in the `__tests__/` folder of each code folder and their utilities in `__tests__/utils/`.

Each microservice will be an app in `backend/apps/<service>` with its domain, its databases, its migrations and its deployment. The planned services are `identity`, `tasks`, `reports`, `notifications`, `realtime`, `billing`, `files`, `agreements`, `assistant` and `backoffice-api`. The first one is `identity`, in phase F4.

```text
backend/                       external dependencies in backend/package.json, aliases in tsconfig.base.json
  apps/<service>/              one microservice per app (the first, identity, in F4)
  libs/
    contracts/platform/        @contracts/platform: contract kit and cross-cutting pieces
    contracts/identity/        @contracts/identity: contract of the identity service
    platform/                  kernel, primitives, config, observability, persistence, criteria,
                               sharding, cache, bloom, resilience, rate-limit, messaging,
                               internal-api, saga
    platform/adapters/         aws, postgres and valkey: one adapter per provider
    shared/utils/              pure functions over the contract types
  tools/                       contracts-export (contracts to JSON) and app-bundler (esbuild)
  dist/<app>/                  bundle of each app, generated by the build target
  infra/terraform/             AWS modules, stacks and environments
  infra/scripts/  infra/local/ deployment, validation and local environment
front/                         Flutter pub workspace
  apps/{web,mobile}/           shells
  microfrontends/              account, assistant, backoffice, billing, notifications, tasks, verifier
  packages/                    api, auth, contracts, i18n, shell_core, shell_host, test_utils, tokens, ui, utils
  tools/                       contracts_gen, nx-plugin and microfrontend checks
docs/                          architecture, ADRs, per-phase designs and audits
.claude/                       backend and front skills, hooks and agents
```

**Internal structure of each module**

```text
backend/apps/<service>/src/
  modules/<module>/
    domain/          pure entities, value objects, ports, errors
    application/     use cases
    infrastructure/  persistence/{entities,mappers} and TypeORM repositories, clients
    presentation/    controllers, gateways, message handlers
  shared/{enums,constants,types,utils}/   shared between the modules of the service
  database/          reference DataSource for the shard and the catalog
backend/apps/<service>/migrations/{shard,catalog}/   TypeORM migrations
```

**Dependency rules**

- Between projects the `@nx/enforce-module-boundaries` rule governs, by tags (`type:contracts`, `type:util`, `type:platform`, `type:tool`, `type:app`). An app imports from another service only its `@contracts/<service>` package.
- Inside a module, `domain` depends only on `kernel`; `application` depends on `domain`; `infrastructure` and `presentation` depend on both. `dependency-cruiser` checks it in CI from the first service on.
- `@aws-sdk/*` only appears in `backend/libs/platform/adapters/aws`.
- The transaction ports live in `@platform/primitives`, so `messaging` and `internal-api` use the transaction without depending on `@platform/persistence`.
- CI runs `pnpm nx affected -t lint test typecheck build analyze format-check`: it validates only what changed, in backend and front.

## Front: shells and microfrontends

`front/` gathers the whole client in a Flutter pub workspace (ADR 0012). Two shells, `web` and `mobile`, compose the same microfrontends: a domain is written once and shows up on both platforms. Nx orchestrates the workspace with its own plugin `front/tools/nx-plugin/index.cjs`, which registers each package as a `front-<name>` project with `analyze`, `format-check` and `test`.

| Piece                    | What it is                                                                                                                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `front/apps/web`         | Web shell (`web_shell`): registers the microfrontends, creates the `ShellRuntime` and builds the router with `buildShellRouter`, with a step-up page. Deferred loading per profile, `admin.<domain>` for the backoffice and web push with a Service Worker |
| `front/apps/mobile`      | Shell for iOS and Android (`mobile_shell`) with its registry, its router and deep links; push with APNs and FCM, secure storage and device keys                                                                                                            |
| `front/microfrontends/*` | One package per domain (`mf_<domain>`) with its manifest, screens, data and texts; declares which platforms it runs on                                                                                                                                     |
| `front/packages/*`       | Pieces shared by the shells and the microfrontends                                                                                                                                                                                                         |

**Contract of a microfrontend**

Each microfrontend exports a `MicrofrontendManifest` from `shell_core` and fulfills the contract of ADR 0018:

```dart
final MicrofrontendManifest tasksManifest = MicrofrontendManifest(
  id: tasksId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: tasksReadRule,
  modes: const {ShellMode.demo},
  menu: const [
    MenuEntry(label: tasksMenuLabel, path: TasksPaths.list, order: 20, icon: Icons.check_circle_outline),
  ],
  deepLinks: _deepLink,
  screens: [
    ScreenRoute(
      path: TasksPaths.list,
      loadLibrary: screens.loadLibrary,
      builder: (scope, {params = const {}}) => screens.buildTasksList(scope),
    ),
  ],
  lifecycleFactory: () => MiLifecycle(),
);
```

The manifest is imported eagerly to build routes, menu and visibility. The screens, the data and the texts live behind `deferred as` and are downloaded when someone navigates to them. `front/tools/check_deferred_chunks.dart` checks this in CI on the web build.

| Microfrontend   | Web | Mobile | Content                                                 |
| --------------- | --- | ------ | ------------------------------------------------------- |
| `account`       | Yes | Yes    | Profile, sessions, devices, MFA and agreements          |
| `tasks`         | Yes | Yes    | Example CRUD                                            |
| `notifications` | Yes | Yes    | Inbox and preferences                                   |
| `assistant`     | Yes | Yes    | The tenant's AI assistant                               |
| `billing`       | Yes | No     | Plans, usage and invoices                               |
| `backoffice`    | Yes | No     | Platform profiles; consumes `backoffice-api`            |
| `verifier`      | No  | Yes    | MFA codes and sign-in approval on the registered device |

**Rules**

- Each shell includes only the microfrontends that declare its platform. The web loads them deferred, so the web of a customer without backoffice access never runs its code.
- Microfrontends depend only on `front/packages` and never on each other. They communicate through shell events and routes.
- Adaptive screens: the `ui` widgets adjust to large and small screens. A screen with its own version per platform is declared with `PlatformScreen`.
- Visibility by permissions, plan and feature flag with the enums generated from the backend. The interface hides what the user cannot use; the authority is the API.
- Nothing in `front/` imports backend libraries; it only uses what is generated in `front/packages/contracts`.
- What is shared between the screens of a microfrontend lives in its `lib/src/shared/{enums,constants,types,utils}`.
- Tests go in the `test/` of each package with the folders of `lib/src`. What the tests of one package share goes in its `test/utils/`, and what is shared between packages goes in `front/packages/test_utils`.
- The generators, including the microfrontend one, arrive with phase F11.

**Shared packages** (`front/packages`)

| Package      | What it contains                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `shell_host` | What the two shells have in common: startup, session, login, step-up, access denied page and demo mode                                     |
| `shell_core` | `MicrofrontendManifest`, `ScreenRoute`, registry, `ShellRuntime`, `ShellContext`, router (`buildShellRouter`) and access rules             |
| `api`        | `ApiClient` with an injectable `HttpTransport`: validates the request against the contract before calling and decodes responses and errors |
| `contracts`  | Handwritten `lib/src/core` and `lib/src/<service>` generated by `contracts_gen` from `backend/libs/contracts`                              |
| `utils`      | Pure functions over the `contracts` types: amounts, dates and field errors                                                                 |
| `auth`       | Ports, models and `SessionManager` for the session                                                                                         |
| `ui`         | Adaptive widgets, layout (`AppPage`, `ShellChrome`, `PlatformScreen`) and theme                                                            |
| `test_utils` | `auth` doubles and `DeferredLibrariesLoader` for the tests of several packages; only in `dev_dependencies`                                 |
| `tokens`     | Design colors and scales in Dart                                                                                                           |
| `i18n`       | Texts in Spanish and English (ARB), including the messages of the error catalog                                                            |

The realtime client, with SSE and Socket.IO adapters, arrives with the `realtime` service.

**Code generation.** `pnpm nx run contracts-export:export` writes the `contract.json` of each service from `backend/libs/contracts`, and `dart run contracts_gen` generates the Dart in `front/packages/contracts`. CI fails if the generated code is out of date, so a contract change in the backend reaches web and mobile in the same PR.

**Deployment.** The Terraform module `cloudfront-waf` creates the S3 bucket and the CloudFront distribution for the web, and `nx affected` tests only the microfrontends that changed. Phase F12 brings the pipeline that publishes the web and the mobile app to their stores. If the public web needs search engine ranking, the marketing pages are published as a separate static site.

## Platform agnostic

Each external capability is a port in the platform library that uses it (for example `CachePort` in `@platform/cache` or `RateLimiter` in `@platform/rate-limit`), with one adapter per provider in `backend/libs/platform/adapters/<provider>` (today `aws`, `postgres` and `valkey`). The business talks to the port; each service's module picks the adapter through configuration. Changing clouds means writing new adapters and a different Terraform.

| Capability                 | Port                                | AWS adapter                              | Local adapter and alternatives                          |
| -------------------------- | ----------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| Topics (pub/sub)           | `TopicPublisher`                    | SNS                                      | In memory; Google Pub/Sub, Kafka                        |
| Queues                     | `QueueSender`, `QueueConsumer`      | SQS                                      | In memory, BullMQ over Valkey; RabbitMQ                 |
| Files                      | `FileStorage`                       | S3                                       | Local file system, MinIO; GCS, Azure Blob               |
| Scheduled jobs             | `JobScheduler`                      | EventBridge Scheduler                    | `node-cron`; Cloud Scheduler, Kubernetes CronJob        |
| Cache and short-lived data | `Cache`, `KeyValueStore`            | ElastiCache for Valkey                   | Valkey in Docker; any Redis-compatible server           |
| Email                      | `EmailSender`                       | SES                                      | SMTP with Mailpit                                       |
| Push                       | `PushSender`                        | APNs, FCM and Web Push directly          | The same on any cloud                                   |
| Secrets                    | `SecretsProvider`                   | Secrets Manager                          | Environment variables; Vault                            |
| Feature flags              | OpenFeature                         | Own provider over DB + Valkey            | flagd; AppConfig                                        |
| Realtime                   | `RealtimeGateway`                   | Socket.IO and SSE in NestJS on Fargate   | The same gateways locally or on Kubernetes              |
| Signatures and encryption  | `Signer`, `KeyManagement`           | KMS                                      | Local keys                                              |
| Compute entry point        | `main.ts`, `lambda.ts`, `worker.ts` | Lambda, Fargate                          | Any container                                           |
| Observability              | OpenTelemetry                       | ADOT Collector to OpenObserve on Fargate | OpenObserve in a container; any OTel-compatible backend |

The messaging topology, the jobs and the buckets are declared in code in an abstract way (topic, queue, job). The AWS Terraform reads those declarations; another provider would have its own module reading the same ones.

**Agnostic entry points**

Endpoints, event handlers, jobs, internal operations and realtime messages are written once with platform decorators (`@Endpoint`, `@Subscribe`, `@ScheduledJob`, `@InternalOperation`, `@RealtimeHandler`) and call use cases. An inbound adapter translates each runtime to those declarations.

| Runtime                      | Inbound adapter                                                               |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Lambda with HTTP API Gateway | `lambda.ts` turns the event into a NestJS request                             |
| Lambda with SQS              | Turns the batch into messages for `@Subscribe` and reports partial failures   |
| EventBridge Scheduler        | Turns the trigger into the execution of its `@ScheduledJob`                   |
| Realtime container           | NestJS `@WebSocketGateway` (Socket.IO) and `@Sse()` call `@RealtimeHandler`   |
| Fargate, Kubernetes or local | `main.ts` and `worker.ts`: HTTP server, long polling consumers, cron and `ws` |

Changing runtime means changing the inbound adapter. Controllers, handlers and use cases stay the same.

## Identifiers, traceability and observability

**UUIDv7 identifiers**

- Every identifier is a UUIDv7: users, tenants, sessions, devices, events, sagas, jobs, files, invoices and the `traceId` itself.
- The app generates the ID with `UuidV7IdGenerator` (in-house, on top of `node:crypto`, behind the `IdGenerator` port), so the entity has an identity before it is persisted. In TypeORM `@PrimaryColumn('uuid')` is used.
- UUIDv7 values sort by time: Postgres indexes grow in order and serve as a pagination cursor (`?after=<id>`).
- Secrets use 256 random bits from `crypto.randomBytes`: refresh tokens, `mfaToken`, OTP, reset tokens and API keys.
- A UUIDv7 reveals its creation date to the millisecond. This is taken into account in public IDs where that date is sensitive.

**Traceability**

- The `traceId` is a UUIDv7 generated when entering the system. Its 128 bits without hyphens form a valid W3C trace-id inside `traceparent`, compatible with OpenTelemetry and X-Ray.
- It travels in HTTP headers, the attributes of each message, saga steps, auditing and as a comment in every SQL statement.
- The response returns `x-trace-id` so support can find the case in seconds.
- If an external client sends its own `traceparent`, it is stored as `externalTraceId`.

**Observability with OpenTelemetry**

OpenTelemetry (OTel) is the open instrumentation standard: it produces logs, traces and metrics linked by the same `traceId` and sends them to any backend. The backend is the tool where they are queried, in the style of Datadog.

- Automatic instrumentation of HTTP, NestJS, `pg`, the Valkey client, the AWS SDK and `fetch`. Custom spans in use cases, saga steps, message handlers and jobs.
- Logs: the `LoggerPort` writes JSON with `trace_id` and `span_id` and exports them as OTel logs, so every log opens its full trace. Fields such as `password`, `token` and `authorization` are hidden automatically.
- Metrics: latency per endpoint, errors per code, queue depth and age, retries, stuck sagas, cache hits and usage per tenant.
- An OpenTelemetry Collector receives everything and forwards it: in Lambda as a layer (ADOT, the AWS distribution), in Fargate as a sidecar and locally inside `docker-compose`. Changing backend means changing the Collector configuration.

A single tool brings together logs, metrics, traces, dashboards and alerts in every environment: **OpenObserve**.

| Tool        | What it is                                                                                                                    | Use                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| OpenObserve | Open source and OTel native; logs, metrics, traces, dashboards and alerts in one interface; runs in a single Docker container | Every environment: one container locally and a Fargate task with S3 storage on AWS |
| SigNoz      | Open source with more complete APM views; runs with Docker Compose on ClickHouse                                              | Alternative if deeper trace analysis is needed                                     |

**Log volume control**

| Control                                        | Use                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `LOG_LEVEL` (`debug`, `info`, `warn`, `error`) | Global level; in Lambda it also feeds `logging_config.application_log_level` |
| `LOG_SAMPLE_RATE`                              | Percentage of requests that log at debug (example: 0.01)                     |
| `LOG_DEBUG_CONTEXTS`                           | Debug only for specific modules (example: `auth,reports`)                    |
| `DB_LOG_QUERIES`, `DB_SLOW_QUERY_MS`           | SQL off by default, slow queries always logged                               |
| Feature flag `log-level`                       | Hot level change, without a redeploy                                         |

Trace sampling is configured in the Collector (every trace with an error and a percentage of the rest). Retention is 14 days in dev and 30 in prod.

## Errors

Each error has a unique, readable code with the form `SERVICE.SUBMODULE.ERROR`. The frontend reacts to the code; the message is only for people.

```ts
// backend/libs/contracts/identity/src/enums/identifiers.enum.ts
export enum IdentityErrorCode {
  MfaCodeInvalid = 'IDENTITY.MFA.CODE_INVALID',
  MfaCodeExpired = 'IDENTITY.MFA.CODE_EXPIRED',
  MfaTooManyAttempts = 'IDENTITY.MFA.TOO_MANY_ATTEMPTS',
  MfaStepUpRequired = 'IDENTITY.MFA.STEP_UP_REQUIRED',
  // ...
}

// backend/apps/identity/src/modules/mfa/domain/errors/mfa-code-expired.error.ts
export class MfaCodeExpiredError extends DomainError {
  readonly code = IdentityErrorCode.MfaCodeExpired;

  constructor() {
    super('The MFA code expired');
  }
}
```

Platform codes carry the `PLATFORM.` prefix and are gathered in `PlatformErrorCode` from `@contracts/platform`. `PlatformError` from `@platform/kernel` is the base of every error (`code`, `retryable`, `details`), and `DomainError` extends it for business rules.

**Catalog.** `defineErrorCatalog` from `@contracts/platform` creates one entry per enum value, with HTTP status, whether it can be retried, audience (`public` or `internal`), description and `messageKey`. Public codes reach the front generated in Dart, and a test requires their message in Spanish and English in the ARB files of `front/packages/i18n`. Internal codes never reach the client.

**Failure classification.** `classifyFailure` from `@platform/primitives` returns a `FailureKind` (`Transient`, `Permanent`, `ProtocolViolation`, `Timeout`, `Cancelled`) shared by resilience, cache, messaging, sharding, internal-api and saga. Each adapter translates its provider's errors to a `failureKind`, and anything unknown is not retried.

**Response** in RFC 9457 format (Problem Details):

```json
{
  "type": "https://docs.<domain>/errors/IDENTITY.MFA.CODE_EXPIRED",
  "title": "El código expiró",
  "status": 400,
  "code": "IDENTITY.MFA.CODE_EXPIRED",
  "detail": "Solicita un código nuevo.",
  "traceId": "0193f1c2-...",
  "errors": [{ "field": "code", "code": "PLATFORM.VALIDATION.REQUIRED" }]
}
```

**Rules**

- Use cases only throw domain errors. `ProblemDetailsFilter` from `@platform/http`, which arrives with F4, translates them to HTTP with the catalog.
- An unexpected error responds with `PLATFORM.INTERNAL.UNEXPECTED` with its `traceId` and no internal details.
- Each internal operation declares the codes it can return. The client treats an undeclared code as a protocol violation.
- A catalog test fails if a code is repeated, if it does not follow the format or if a `PLATFORM.*` code from the libraries has no entry. The catalog is published in the documentation portal.

## Endpoints

A single decorator, `@Endpoint`, takes the route from the contract and brings together authentication, authorization, MFA, rate limit, version and deprecation. The method, the path, the schemas, the error codes and the access come from the `RouteDefinition` of `@contracts/<service>`, so the server cannot diverge from the contract the front consumes (decision 3 of the F4 design). `@platform/http` arrives with F4.

```ts
@Resource(IdentityResource.Sessions)
export class SessionsController {
  constructor(
    private readonly runner: UseCaseRunner,
    private readonly refresh: RefreshSession,
  ) {}

  @Endpoint(RefreshSessionRoute, {
    rateLimit: RateLimitTier.Auth,
    sessionCookie: SessionCookieMode.Rotate,
  })
  refresh(
    @Input() input: RouteRequest<typeof RefreshSessionRoute>,
    @Exchange() http: HttpExchange,
  ) {
    return this.runner.run(this.refresh, { ...input, client: http.client });
  }
}
```

`@Endpoint` fails at startup if a public route declares `auth`, if a path is registered twice or if the service contract has a route without a handler.

**Pipeline of each request**

1. Middleware: `traceId` and request context with `AsyncLocalStorage` (`RequestContext`), security headers and the `Origin` policy, which sets the web or native channel.
2. Guard: authentication (JWT or API key), tenant, rate limit, access and the version's closing date.
3. Interceptors: context with tenant and actor, timeout, `Api-Version`, deprecation headers and session cookie.
4. Pipe: validates the input against the route's zod schema (`PLATFORM.VALIDATION.INVALID_INPUT` with per-field errors).
5. Filter: errors in RFC 9457 format.

Use cases run inside a `UseCaseRunner` with chainable behaviors (transaction, auditing, metrics, retries). Those behaviors apply the same way whether the use case is invoked over HTTP, through the internal API, from a queue or over WebSocket.

The database connection is defined in the module and stays out of the endpoint: `PersistenceModule.forFeature({ entities: [TaskEntity], sharding: { key: ShardKey.Tenant } })`.

**Access matrix.** CI generates the list of all endpoints with their authentication and permissions. A public endpoint shows up flagged and requires approval in the PR.

**Versioning**

- **Major version in the URL** (`/v1`, `/v2`) for complete redesigns, with NestJS native versioning.
- **Per-request version within the major**: the client sends `Api-Version: 2026-11-01` (if it omits it, the version pinned to its API key or tenant is used). The business logic lives once in the current version; per-version transformers convert the old request to the current one and the current response to the old format. When a version really changes behavior, `@Endpoint({ versions: { [ApiVersion.V2026_06]: LegacyCreateTask } })` resolves another use case through dependency injection. This keeps the business free of per-version conditionals.

**Deprecation**

- `@Endpoint({ deprecated: { since, sunset, replacement } })` adds the `Deprecation`, `Sunset` and `Link` headers.
- Usage is measured per version, tenant and API key, and `notifications` warns those who use it 90, 30 and 7 days before the closing date.
- After the `sunset`, the endpoint responds `410` with `PLATFORM.API.VERSION_SUNSET`.

**Autogenerated documentation**

- OpenAPI generated from `contract.json` in phase F11, without `@nestjs/swagger` (decision 4 of the F4 design), with a Scalar UI.
- AsyncAPI for events and queues, generated from the topology and the contracts.
- A portal that brings together every service, the error catalog and the access matrix. In prod it sits behind authentication.
- The front receives the contracts generated in Dart (`front/packages/contracts`) and calls the API with `ApiClient`.

## Persistence

TypeORM is the ORM, and `backend/libs/platform/persistence` wraps it and adds what is specific to the platform: choosing the logical shard, reaching the physical instance, keeping a transaction in a single shard, reading from the replica and migrating every database (ADR 0024, which replaces 0009). The domain sees only repository ports. The service writes entities, mappers, repositories and migrations, and the routing is transparent.

```ts
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [UserEntity],
      sharding: { key: ShardKey.User },
    }),
  ],
  providers: [
    UserMapper,
    { provide: UserRepository, useClass: TypeOrmUserRepository },
  ],
})
export class UsersModule {}

export class TypeOrmUserRepository
  extends ShardedRepository<User, UserEntity>
  implements UserRepository
{
  async findByEmail(email: Email): Promise<User | null> {
    const entity = await this.manager().findOneBy(UserEntity, {
      email: email.value,
    });
    return entity ? this.mapper.toDomain(entity) : null;
  }
}
```

**Pieces of `@platform/persistence`**

| Class                                       | Responsibility                                                                                                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShardDataSources`                          | One TypeORM `DataSource` per physical database (instance plus logical shard), with primary and replicas. It creates them on first use and closes the old one when a shard changes instance      |
| `CatalogDataSource`                         | The catalog's `DataSource`                                                                                                                                                                      |
| `ShardResolver`                             | Takes the key from the context according to the module, calls `ShardRouter` and returns the shard's `DataSource`                                                                                |
| `TypeOrmTransactionManager`                 | Implements the `TransactionManager` port from `@platform/primitives` with a `QueryRunner` of the shard. Runs the `afterCommit` hooks and refuses to touch another shard in the same transaction |
| `EntityManagerProvider`                     | The `EntityManager` of the current transaction or, outside one, the replica's. `readPrimary()` forces the primary                                                                               |
| `ShardedRepository` and `CatalogRepository` | Base of the repositories: tenant, optimistic version (`@VersionColumn`), soft delete (`@DeleteDateColumn`), auditing and `Criteria` with UUIDv7 cursor pagination                               |
| `ShardScope`                                | Runs a block in the shard of an explicit key, such as the user of another tenant (ADR 0023)                                                                                                     |
| `AcrossShards`                              | Walks several shards for reports and maintenance, with a deadline and bounded concurrency                                                                                                       |
| `ShardedMigrationRunner`                    | Runs the migrations of each logical shard and of the catalog, each one under `pg_advisory_lock`                                                                                                 |
| `PersistenceModule`                         | `forRoot(config)` sets everything up with default values, and `forFeature({ entities, sharding })` registers a module's repositories with its key                                               |

**Entities and migrations**

- The base entities (`AuditedEntity`, `VersionedEntity`) bring a uuid `id`, auditing, version and soft delete in `timestamptz`. Each module's shard key is declared in `forFeature`, not in decorators on the entity.
- Each service keeps its migrations in `migrations/shard` and `migrations/catalog`. `pnpm nx run <service>:migration-generate --name=<Name> --target=shard` generates them by comparing the entities with a temporary database; `migration-run` and `migration-revert` use the same `DataSource` objects. `synchronize` is always off.
- The platform tables (outbox, processed messages, idempotency, shard directory and saga log) bring their entities and migrations from `@platform/adapters-postgres`.

**Status and next step.** Today `@platform/persistence` runs on the `pg` driver, with `TableDefinition`, `BaseRepository` and migrations in SQL. The next phase builds the design approved on November 14, 2026 in three packages: P1, the persistence core with integration tests on two real Postgres shards and the Nx migration targets; P2, the platform tables on TypeORM; and P3, the saga engine. P1 and P3 start together, and P2 starts when P1 settles its interfaces.

**Partitioning**

- It is declared in the migration, by range, list or hash.
- Since the UUIDv7 contains the date, partitioning is by range of the `id` itself and the primary key is still just `id`.
- The migration creates the first partitions, and a scheduled job creates the future ones and archives the expired ones.
- In development, the layer warns when a query on a partitioned table omits the partition key.

**Sharding**: the routing of each query to the right shard is detailed in [Sharding and data routing](#sharding-and-data-routing).

**Query cache with Valkey**

- Cache-aside in the layer, enabled per repository or per module, with a short TTL (2 to 10 seconds) and random jitter.
- Invalidation by version: each tenant and entity has a counter that is part of the key. A write increments it and the previous keys become stale instantly.
- Single-flight: for an expired key, a single request queries the database and the others wait for its result.
- Reads inside a transaction go directly to the database.

**Change auditing**

- `@Audited({ exclude: ['passwordHash'] })` on the entity generates, in the migration, a trigger that writes to `audit_log`.
- The layer runs `set_config('app.actor_id' | 'app.tenant_id' | 'app.trace_id', …, true)` in each transaction. That way the trigger knows who made the change, even in bulk updates or manual SQL.
- Each record stores table, id, operation, values before and after (only changed fields), actor, tenant, `traceId` and date.
- `audit_log` is partitioned by month, only accepts inserts and has configurable retention.
- The backoffice shows the history of any record.

## Sharding and data routing

Each query reaches its shard without the business code asking for it: the repository takes the key from the context, the router resolves the shard and the layer picks primary or replica. The template starts with one shard and grows to N with the same code.

| Concept           | What it is                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Logical shard     | A PostgreSQL database with the full schema of the service. Several logical shards coexist on one physical instance                              |
| Physical instance | An RDS server with its RDS Proxy and its replicas; it hosts one or more logical shards                                                          |
| Shard group       | The logical shards assigned to a tenant within its region: one for a small tenant, several for a large one                                      |
| Shard key         | The value that picks the shard within the group. Each service or entity declares its own according to how its data is queried                   |
| Region            | Country or region where the tenant's information lives, chosen by the tenant                                                                    |
| Catalog           | Small global database with the tenant → region → group directory, the logical shard → instance map, the global indexes and the reference tables |

The routing chain is **tenant → region → shard group → logical shard → physical instance**. Tenants and shards are independent: growing means adding logical shards to a group or moving logical shards to new instances, without touching the tenants one by one.

**Declaration in code**

Each module declares its key when it registers its entities. The repository and the entity are the same with any distribution.

```ts
// tasks distributes by tenant.
PersistenceModule.forFeature({
  entities: [TaskEntity],
  sharding: { key: ShardKey.Tenant },
});

// identity distributes user data by user (ADR 0023).
PersistenceModule.forFeature({
  entities: [UserEntity],
  sharding: { key: ShardKey.User },
});
```

Global entities, such as the reference tables, live in the catalog and are read with `CatalogRepository`.

**The key according to the need**

| Key               | When                                                    | Examples                                               |
| ----------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `ShardKey.Tenant` | The data is queried by tenant and fits in one shard     | tasks, billing, reports                                |
| `ShardKey.User`   | The data is queried by user or the tenant is very large | identity, preferences, notification inbox              |
| `ShardKey.Custom` | Another access pattern, with a `ShardKeyResolver`       | An entity distributed by account or by business region |

When the key differs from the tenant, the router first locates the tenant's group and then picks the logical shard with consistent hashing over the key. That way a shared tenant with millions of customers is spread over several shards without creating a hot shard.

**Global indexes.** Queries that arrive without the key use an index in the catalog. Login by email queries `identity_lookup`, which stores the HMAC of the email with the `userId`, the region and the shard: routing data, with no personal data in clear text.

**First implementation: identity.** Sharding debuts in `identity` (users, credentials, sessions, devices) with one logical shard per region in production and two locally and in tests. The other services use the same code with a single shard and enable more when their traffic calls for it, through configuration.

**How a query is routed**

&#91;embedded content: routing of a query · from the entry point to the shard\]

The directory result is cached at three levels. Inside a transaction, reads go to the primary; outside one, to the replica. Whoever needs to read what they just committed without a transaction uses `readPrimary()`, because the next request may land on another process.

If the context arrives without a shard key, the layer responds `PLATFORM.SHARDING.KEY_MISSING` and the query stops. There is never a default shard.

**Strategies** (`ShardingStrategy` interface, interchangeable per module)

| Strategy              | How it decides                        | When to use it                                              |
| --------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `Directory` (default) | `tenant → shard` table in the catalog | Moving tenants and giving dedicated shards to large tenants |
| `ConsistentHash`      | Ring with virtual nodes               | Many small keys without a catalog                           |
| `Range`               | Ranges of the key                     | Keys with a natural order, such as dates                    |
| Custom                | Implementation of `ShardingStrategy`  | Specific business rules                                     |

New tenants get a shard through a `ShardPlacementPolicy` during the onboarding saga: the shard with the least load, the tenant's region or a dedicated shard for enterprise plans.

**Cross-shard queries**, always explicit: `AcrossShards` walks the service's shards in parallel, with a concurrency limit and a per-shard deadline, and indicates when a result is partial. It is used in the backoffice, reports and maintenance tasks such as saga recovery.

**Transactions.** A transaction lives inside one shard. Touching two shards in the same transaction responds `PLATFORM.SHARDING.CROSS_SHARD_TX`; that case is solved with a saga.

**Migrations.** Each app's `migrate` binary uses `ShardedMigrationRunner`: it migrates the catalog and each logical shard, each one under `pg_advisory_lock`, so two tasks that start at the same time do not apply the same migration. If a shard fails, the service's deployment stops.

**Moving data without interruption** (`SagaType.MoveShard` takes a logical shard to another instance; `SagaType.MoveTenant` takes a tenant to another group or region)

1. **Initial copy**: snapshot of the tenant's rows, or of the whole logical database, at the destination.
2. **Continuous synchronization**: PostgreSQL logical replication with a filter on `tenant_id` (row filters available since PostgreSQL 15) keeps the destination up to date. The source keeps serving reads and writes.
3. **Verification**: counts and checksums per table while the replication lag drops to zero.
4. **Cutover**: a per-tenant lock in Valkey holds new writes for an instant (target: less than one second). Requests wait, none fail. With zero lag the directory is switched and `PlatformEvent.ShardDirectoryChanged` is published.
5. **Close**: writes continue against the destination. The source is kept during a grace period to roll back if needed, and then it is cleaned up.

**Data residency by region**

- Each tenant chooses a country or region when it is created; the directory stores it and the onboarding saga places it in a shard group of that region.
- Each region deploys its own stack: services, shards, Valkey, queues and file storage. The tenant's data stays in its region.
- The global catalog stores only routing data (ids, region, shard and the HMAC of the email). It lives in the main region with read replicas in the others.
- Login queries the catalog and returns the regional URL (for example `co.api.<domain>`). The JWT carries the region (`rgn`) and the client SDK uses that URL. A request that reaches another region receives a redirect.
- Changing region is a `MoveTenant` between regions, with the same move without interruption.
- The first version deploys one region; adding another means deploying its stack with Terraform.

**Sharding operations as code.** The shards are declared in each service's versioned configuration and in Terraform. Adding a shard or moving a tenant is a change in the repository that follows the normal cycle: PR, review and pipeline. The pipeline applies the infrastructure, runs the migrations and, when the change includes moves, launches the `SagaType.MoveShard` saga. Each run is recorded in the audit log with the commit that originated it.

**Operation.** Each span carries `db.shard`; there are per-shard metrics (connections, latency, size, tenants) and an imbalance alarm. Locally and in the integration tests two shards run, so routing is exercised from day one.

## Vector and hybrid search

PostgreSQL handles semantic search with the pgvector extension, in the same shard and under the same tenant rules as the rest of the data. A separate search engine is not needed.

```ts
@Searchable({
  text: [TaskField.Title, TaskField.Description],
  embedding: { fields: [TaskField.Title, TaskField.Description], model: EmbeddingModel.Default },
})
export class TaskOrmEntity { ... }

const results = await this.taskSearch.search({
  query: 'facturas vencidas de proveedores',
  mode: SearchMode.Hybrid,
  filter: Criteria.where(TaskField.Status).eq(TaskStatus.Open),
  limit: 20,
});
```

- **Storage**: one embeddings table per searchable entity (`entity_id`, `tenant_id`, model, model version, vector, `content_hash`), in the tenant's shard, with an HNSW index.
- **Asynchronous generation**: when the entity is saved, the outbox publishes the change and a consumer computes the embedding with the `EmbeddingProvider` port. The `content_hash` avoids recomputing when the text did not change.
- **Hybrid search**: Postgres full text (`tsvector` with Spanish configuration) and vector similarity, merged with Reciprocal Rank Fusion. Modes `SearchMode.Text`, `Vector` and `Hybrid`.
- **Filters**: per-tenant RLS plus the query criteria; pgvector iterative index scans keep the number of results when the filter is selective.
- **Model change**: each vector stores its model version; a job reindexes in the background and search uses the active version until it completes.
- **Embedding providers**: Voyage AI, Amazon Bedrock or a local model for development and tests, interchangeable through configuration.
- The AI module uses this same search to retrieve context (RAG).

## AI module

`libs/platform/ai` gives any service AI capabilities with the same rules as the rest of the platform: ports, tenant, permissions, auditing, costs and traces. The example service `apps/assistant` is an assistant with search over the tenant's data and tools that run use cases.

**Providers**

| Port                                                          | Default adapter                     | Alternatives                                                                                 |
| ------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `LlmProvider` (messages, streaming, tools, structured output) | Claude API with `@anthropic-ai/sdk` | Claude on Amazon Bedrock (`AnthropicBedrockMantle`); local model with Ollama for development |
| `EmbeddingProvider`                                           | Voyage AI                           | Amazon Bedrock; local model                                                                  |

Models are chosen by enum, so changing models is configuration: `AiModel.Default` points to `claude-opus-5-5`; `AiModel.Fast` to `claude-haiku-5-5` for bulk classification and extraction.

**Prompts, outputs and tools**

```ts
@AiPrompt({
  id: PromptId.SummarizeTask,
  version: 3,
  model: AiModel.Default,
  effort: AiEffort.Medium,
})
export class SummarizeTaskPrompt extends PromptDefinition<
  SummarizeInput,
  TaskSummary
> {
  readonly output = TaskSummarySchema; // zod, validated on receipt
}

@AiTool({ description: 'Creates a task for the current user', confirm: true })
export class CreateTaskTool extends UseCaseTool<CreateTaskUseCase> {}
```

- Prompts as versioned classes, with their output schema and tests.
- Structured output with the provider's JSON format, validated with zod before reaching the use case.
- `@AiTool` exposes an existing use case as a tool. It runs with the `Actor`, the tenant and the permissions of the user in the conversation. Tools that modify data ask the user for confirmation.
- The tool loop uses the tool runner of the Anthropic SDK.
- Streaming responses to the client over SSE.

**RAG**: the context comes from the tenant's hybrid search. Retrieved documents enter the model as data and never as instructions, with citations to their source.

**Costs and limits**

- Each call publishes `BillingEvent.UsageRecorded` with input and output tokens per tenant, user and model.
- Per-plan quotas with entitlements (`Feature.AiAssistant`, `Quota.AiTokensMonthly`) and per-user limits.
- Provider prompt caching: stable tools and system prompt go first.
- Bulk jobs through a queue with the provider's Batches API, which costs half.

**Security and resilience**

- Redaction of personal data before sending, configurable per tenant.
- If the model refuses a request (`stop_reason: refusal`), the server fallback (`fallbacks: "default"`) is used and the case is recorded.
- Timeout, circuit breaker, bulkhead to respect the provider's rate limit and fallback to another adapter.
- Record of every interaction (prompt, version, response, tools used) with configurable retention and auditing.

**Observability and quality**

- OpenTelemetry spans per call with model, tokens, latency and cost, visible in OpenObserve next to the rest of the trace.
- A set of evaluation cases per prompt. CI runs them when a prompt changes and compares against the previous version.

## Resilience and Bloom filters

`backend/libs/platform/resilience` applies named policies (`ResiliencePolicyName`: `Database`, `Cache`, `ExternalApi`, `Ai`, `AiStreaming`, `Email`, `Queue`) to each outbound adapter. The circuit breaker and the bulkhead are in-house, on top of the `Clock` port, without external libraries.

```ts
export class VoyageEmbeddingAdapter implements EmbeddingProvider {
  constructor(private readonly resilience: ResilienceRegistry) {}

  embed(texts: string[]): Promise<number[][]> {
    return this.resilience.execute(
      ResiliencePolicyName.ExternalApi,
      (signal) => this.callVoyage(texts, signal),
      { idempotent: true, dependencyKey: 'voyage' },
    );
  }
}
```

Retries only apply to operations marked as idempotent, and each dependency has its own circuit breaker and bulkhead. `execute` hands the operation an `AbortSignal` per attempt to cancel the work when the timeout or the caller's deadline expires.

| Pattern                                   | What it does                                                                   | Where it is used               |
| ----------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------ |
| Timeout                                   | Cuts off slow calls                                                            | Every network call             |
| Retry with exponential backoff and jitter | Retries only transient errors in idempotent operations                         | HTTP clients, Valkey, queues   |
| Circuit breaker                           | Stops calling a dependency that is down and tries it again after an interval   | External APIs, AI, email       |
| Bulkhead                                  | Limits concurrent calls per dependency                                         | AI, cross-shard queries, files |
| Fallback                                  | Responds in degraded mode: previous cache, alternate provider or default value | Reads, AI, feature flags       |
| Load shedding                             | Responds 503 with `Retry-After` when the load exceeds a threshold              | HTTP gateway and realtime      |

- **Graceful degradation**: if Valkey fails, the cache is skipped and reads go to the database, the rate limit falls back to local limits (`DegradingRateLimiter`) and feature flags use the last known value.
- **Health checks** for liveness and readiness are in-house, without `@nestjs/terminus` (F4 design); an instance without its critical dependencies leaves the load balancer.
- **Infrastructure**: RDS and Valkey in Multi-AZ with automatic failover.
- Each policy emits events for metrics and spans (retry, circuit opening and closing, timeout, bulkhead rejection).
- **Failure testing**: in integration, Toxiproxy injects latency and outages between the services and their dependencies.

**Bloom filters**

The `BloomFilter` port answers "definitely not" or "maybe yes" in microseconds and with very little memory. A "maybe" is always confirmed against the real source, because the filter allows false positives and never false negatives. Adapters: Valkey (`BF.*` commands from the Bloom module, or in-house bitmaps if the deployed version does not include it) and in memory.

| Use                | What for                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Leaked passwords   | Rejects, at sign-up or password change, a password present in the public Have I Been Pwned list, without calling external services |
| Revoked tokens     | Discards healthy tokens in memory before querying Valkey                                                                           |
| Processed messages | Idempotency shortcut before querying `processed_messages`                                                                          |
| Cache protection   | Avoids going to the database for keys that do not exist                                                                            |
| Deduplication      | Repeated metering events and incoming webhooks                                                                                     |

Each filter declares its false positive rate (1% by default) and its periodic rebuild with a scheduled job.

## Identity

The `identity` service issues and controls all identity: users, sessions, devices, MFA, API keys, tenants and groups. The other services only verify, with `@platform/auth`. This is phase F4: its design (`docs/design/f4-identity.md`) splits the construction into fifteen work packages and its ten decisions were approved on November 14, 2026.

**Sessions and JWT**

| Token                    | What it is                                                            | Lifetime                                                                                                                                      | Where it lives on the client                                                                        |
| ------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Access token (JWT ES256) | Stateless; each service verifies it with the public key from the JWKS | 10 to 15 min                                                                                                                                  | Memory                                                                                              |
| Session token (opaque)   | Points to a row in `sessions`; its hash is stored in the database     | Expires after 1 day without activity; each refresh while the app is in use extends the window by another day, with an absolute cap of 30 days | Web: `__Host-session` cookie, `HttpOnly`, `Secure`, `SameSite=Strict`. Mobile: Keychain or Keystore |

- Header `{ alg: 'ES256', typ: 'at+jwt', kid }`. Claims: `iss`, `aud`, `sub`, `tid` (active tenant), `htid` (home tenant), `sid` (session), `did` (device), `amr` (methods used), `auth_time`, `roles`, `proles` (platform roles), `pv` (permissions version of the tenant and the user), `rgn` (region), `sxp` (absolute cap of the session), `iat`, `exp` and `jti` (ADR 0022).
- Web or native channel by header: the mobile app sends `Authorization: Bearer <session token>` on refresh and sign-out, and `X-Session-Transport: bearer` on login and MFA verification. With that it receives the token in the body. Without those headers the channel is web and the token travels only in the cookie. An `Origin` outside the allowed list responds `PLATFORM.AUTH.ORIGIN_REJECTED`.
- Each refresh rotates the session token. Reusing a previous one revokes the whole session.
- Revoking a session publishes `IdentityEvent.SessionRevoked` and adds the `sid` to a list in Valkey with a TTL equal to the remaining lifetime of the access token. The revocation state lives in the `auth:*` space of Valkey: identity writes it and the other services read it (ADR 0022).
- The signing key rotates with `kid` in the JWKS; the previous one coexists during the transition window.
- Passwords with argon2id from `node:crypto` (Node 24.22.2, pinned in `.nvmrc`), at least 12 characters long. Changing the password revokes the other sessions.

**Token invalidation**

An access token is valid until its `exp`, so the platform invalidates it earlier with the mechanisms in this table. The guard checks, in order, the signature, the expiration, the session, the epochs and the permissions version.

| Mechanism                    | What it invalidates                | How                                                                                                                                             |
| ---------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Revoked session (`sid`)      | One session and all its tokens     | List in Valkey with a TTL equal to the remaining lifetime of the access token, with a Bloom filter in front to discard healthy tokens in memory |
| User epoch (`revokedBefore`) | All the tokens of a user           | Timestamp in Valkey; every token with an earlier `iat` is rejected                                                                              |
| Tenant epoch                 | All the tokens of a tenant         | The same mark at tenant level, for suspensions                                                                                                  |
| Permissions version (`pv`)   | Tokens with old roles or groups    | The token carries `pv`; if it does not match the current version, it responds `IDENTITY.TOKEN.STALE_PERMISSIONS` and the client refreshes       |
| Emergency key rotation       | All the tokens signed with a `kid` | The `kid` is removed from the JWKS                                                                                                              |

**What triggers each invalidation**: logout, closing all sessions, a password or MFA change, a removed device, reuse of a session token, a change of roles or groups, a suspended user or tenant, an administrator action and a compromised key.

- `identity` publishes `IdentityEvent.TokensRevoked` with the scope (session, user or tenant). Each service updates its local cache within seconds.
- The realtime gateway immediately closes the Socket.IO and SSE connections of the affected sessions.
- Each invalidation is recorded in the audit log with its reason and its actor.

**Devices**

- On the first login the server issues a signed `deviceId` that the client stores and sends on every login.
- `devices` table: readable name ("iPhone · Safari"), platform, first and last time seen, last IP, `trustedUntil`, push token.
- `login_attempts` table: each attempt on an existing account with result, reason, IP, device and `traceId`. It feeds auditing and brute-force lockout. Attempts with nonexistent emails stay only in Valkey and in the logs, because without a user there is no shard.
- The user sees their devices and sessions, closes remote sessions, closes all but the current one and removes trust from a device.
- Personal data under Law 1581: configurable retention and no invasive fingerprinting.

**Lockout after failed attempts**

| Level                             | Rule                                    | Effect                                                                                                   |
| --------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Account and origin (IP or device) | 5 failures in 15 min                    | That origin is locked for 15 min; each new lockout doubles the wait (15, 30, 60 min) up to a cap of 24 h |
| Account                           | 20 failures in 1 h from several origins | Protected mode: only registered devices and passkeys get in; any other origin also needs a code by email |
| IP                                | 50 failures in 15 min on any account    | IP lockout and a rate limit rule in the WAF against credential stuffing                                  |

- Counters in Valkey with TTL, on top of `@platform/rate-limit` and its `ValkeyRateLimiter` adapter (sliding window in a Lua script).
- Uniform response `IDENTITY.AUTH.INVALID_CREDENTIALS`, with `Retry-After` when there is a lockout. Nonexistent emails count the same, so the lockout never reveals whether an account exists.
- Protected mode prevents an attacker from locking out the owner: from their registered device or their passkey they can still get in.
- When a lockout or protected mode is activated, the user receives an alert by email and push. It is unlocked when the wait expires, with a link by email or from the backoffice with auditing.
- Thresholds configurable per tenant within safe limits. A CAPTCHA challenge (Turnstile or hCaptcha) behind a port is optional from the third failure.
- The same rules apply to MFA attempts, password recovery and API key verification.

**MFA and registered devices**

MFA protects two moments: the registration of each new device, mandatory for all users, and every login of an administrator.

| Who                                  | When MFA is required                                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Customers                            | When registering a device. From a registered device, login uses the code the app generates on its own |
| Tenant and backoffice administrators | On every login                                                                                        |

**Device registration.** The app generates a key pair in Secure Enclave, Android Keystore or WebCrypto (non-exportable) and sends the public key. From that moment the device signs its requests and is bound to the user.

**Login from a registered device.** The verifier app obtains the 8-digit code with a request signed with the device key and sends it without user intervention. For the customer, login is email and password, or just their passkey.

**Login from a new device** (ends up registering it)

1. `POST /v1/auth/sign-in` with email and password. Responds with the tokens or an MFA challenge with `mfaToken` and `methods`.
2. `POST /v1/auth/mfa/challenges { mfaToken, method }`.
   - If the user already has a registered device: an **8-digit** code (2 to 3 min) visible only in the app on that device. A push opens it on the code screen with the context of the attempt (browser, system, approximate city, IP) and the "No fui yo" button.
   - If it is their first device: a **6-digit** code to the verified email (5 min).
3. `POST /v1/auth/mfa/verify { mfaToken, challengeId, code, devicePublicKey }` creates the session and registers the new device.

**Passkeys from the first version** (WebAuthn with `@simplewebauthn/server`). They allow passwordless login; a passkey on a registered device satisfies both factors. In the backoffice it is the recommended method. The WebAuthn options and response travel in base64url inside the contract JSON (`optionsJson`, `credentialJson`), and the server validates them with zod before verifying them.

**Rules.** The code is bound to the `mfaToken` that requested it, is stored as an HMAC and is single use. At most 5 attempts per challenge and 3 challenges every 15 min. With a registered device, email is no longer offered. TOTP and recovery codes remain as a backup.

**Recovery without a device.** By email, with an immediate alert to all of the user's channels. The wait grows exponentially with each recovery in the last 90 days: 24 h, 48 h, 96 h and so on (`MFA_RECOVERY_BASE_HOURS = 24`).

**Additional step (step-up).** `@Endpoint({ mfa: { maxAgeMinutes: 10 } })` protects sensitive operations (changing email or password, disabling MFA, creating API keys). If the last MFA is old, it responds `IDENTITY.MFA.STEP_UP_REQUIRED` and the registered device resolves it with its automatic code.

**Security alerts** (always by email and push): login from a new device, verifier registration, password or verifier recovery, email change, MFA disabled, use of a recovery code, API key created or revoked.

**API keys**

- Format `sk_live_<prefix>_<secret>`. The prefix is stored in clear text to look up the key; the secret as an HMAC with a pepper. It is shown only once.
- They belong to a service account of the tenant, with scoped permissions, expiration, optional allowed IPs, last use and rate limit tier.
- Operations: create (with MFA step-up), list, rotate (the previous one stays valid for N hours) and revoke (an event that invalidates the cache in every service instantly).
- Use cases receive an `Actor` (user or service account) regardless of how it authenticated.

## Multitenancy, groups and backoffice

**Tenants**

- A tenant is an organization. Every user belongs to at least one; end customers can share a common tenant, such as the platform's customers tenant. A user can belong to several with different roles; the JWT carries the active tenant (`tid`) and switching tenants issues a new token.
- Isolation: shared tables with `tenant_id` and Postgres Row-Level Security as a second barrier. The persistence layer sets `app.tenant_id` in each transaction. The behavior of RDS Proxy with these variables is validated in the persistence phase.
- Each tenant has its region and its shard group. A large or shared tenant receives a group of several shards, and one that requires it receives dedicated shards (pool and silo model).
- The tenant is resolved from the JWT, the API key or the subdomain and header on public endpoints. It is propagated to logs, events, cache keys, rate limits, feature flags and billing metrics.
- Lifecycle: onboarding with a saga (`SagaType.TenantOnboarding`), suspension for billing, reactivation and deletion with a saga.

**Groups, roles and permissions**

- Within each tenant, users belong to groups; groups have roles; roles have permissions.
- The permission catalog is an enum in code (`Permission.TasksCreate`). The assignments live in the database and are edited without a deploy.
- Each user's effective permissions are cached in Valkey with a per-tenant version.
- Initial tenant roles: `Owner`, `Admin`, `Member`, `Billing`.

**Backoffice with profiles**

- Platform roles are independent of tenant roles: `PlatformRole.SuperAdmin`, `Support`, `Finance`, `ReadOnly`, extensible. They travel in the `proles` claim of the access token.
- `backend/apps/backoffice-api` is a BFF with its own audience (`aud: backoffice`) that calls each service's internal API.
- Access with mandatory MFA (passkey recommended) and an optional IP list.
- Impersonation ("view as") with a reason, limited duration, full auditing and notice to the user.
- Initial views: tenants and users, sessions and devices, audit history, sagas and DLQs, billing and usage, feature flags, deprecations.

## Agreements: terms, consents and signed documents

The `apps/agreements` service is generic: it handles any document that a user or a tenant must accept or sign, with versions, audiences, evidence and effects on permissions.

| Concept        | What it is                                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Agreement type | `AgreementType` enum, extensible: `TermsOfService`, `PrivacyPolicy`, `DataProcessingConsent`, `MarketingConsent`, `FeatureTerms`, `Contract` |
| Document       | Immutable version of an agreement: content stored in `files`, SHA-256 hash, language, effective date and change type (major or minor)        |
| Audience       | Who it applies to: everyone, a tenant, a plan, a role, a group, a feature or a country                                                       |
| Requirement    | Blocking (without accepting, what it protects cannot be used) or optional, with a grace period                                               |
| Acceptance     | Who, when, which version and hash, IP, device, `traceId` and method                                                                          |
| Revocation     | Withdrawal of a revocable consent, with a date and immediate effect                                                                          |

**Acceptance methods, from least to most evidence**

1. Click on "Acepto".
2. Click plus a verification code (6 digits by email or the automatic code of the registered device).
3. Signature of the document hash with the key of the registered device.
4. Certified digital signature by an external provider, connected through the `DigitalSignatureProvider` port.

**Use in endpoints**

```ts
@Endpoint.post('/reports', { ..., agreements: [AgreementType.DataProcessingConsent] })
```

If an acceptance is missing, the response is `LEGAL.AGREEMENT.ACCEPTANCE_REQUIRED` with the list of pending documents, and the frontend shows them so they can be accepted.

**Effects on permissions.** Accepting an agreement publishes `AgreementsEvent.Accepted`, which can enable permissions or features (for example, sharing data with a third party). Revoking it publishes `AgreementsEvent.Revoked` and removes them.

**Versions.** A major change requires accepting again and becomes blocking when the grace period expires. A minor change is only notified.

**Evidence.** Each acceptance or signature generates a PDF package with the document, the record (who, when, how) and the hashes, stored immutably (S3 Object Lock). The user and the backoffice download it.

**Legal framework.** The design follows Law 1581 of 2012 (prior, express, informed and revocable consent) and Law 527 of 1999 with Decree 2364 of 2012 (data messages and electronic signature). The texts and the signature level of each agreement are validated with legal counsel.

**Backoffice.** Create versions, schedule when they take effect, see the acceptance percentage per audience and export evidence.

## Contracts and internal API

Contracts are the only way a service knows another and the front knows the backend. They are written once, in TypeScript with zod, in `backend/libs/contracts/<service>`, and from there come the intermediate JSON and the front's Dart (ADR 0015 and 0017). Today `platform` and `identity` exist.

```text
backend/libs/contracts/
  platform/              @contracts/platform: kit, cross-cutting schemas and PLATFORM.* catalog
  <service>/             @contracts/<service>: what the service exposes
    src/
      enums/             only enums (access, error codes, routes, operations, events)
      constants/         constant values and `as const` objects
      types/             interfaces
      schemas/           zod schemas with `satisfies z.ZodType<Type>`
      http/              public routes the front consumes
      internal/          internal operations between services
      events/            published events
      errors/            error catalog of the service
      contract.ts        ServiceContract of the service
    export/contract.json generated, committed to git
```

The `@contracts/platform` kit brings `defineRoute`, `defineOperation`, `defineEvent`, `defineErrorCatalog` and `defineServiceContract`, plus `validateContract` and `fieldErrorsFromZod`, which translate zod issues to `FieldError` with `PLATFORM.VALIDATION.*` codes.

**An operation with its declared compensation**

```ts
export const RevokeUserSessionsOperation = defineOperation({
  id: IdentityOperation.RevokeUserSessions,
  input: RevokeUserSessionsInputSchema,
  output: RevokedSessionsSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Revoking sessions is not undone for security reasons: the user signs in again.',
  errors: [IdentityErrorCode.UserNotFound],
  timeoutMs: 3000,
  description: 'Revokes all the sessions of a user and publishes the event.',
});
```

`defineOperation` rejects an operation that modifies data without `compensatedBy`, a `Compensation.None` without a reason, an operation that compensates itself and error codes with an invalid format or repeated. The descriptor is passed directly to the internal API and to the sagas, without classes or decorators.

**Contract rules**

- Every operation that modifies data declares its `compensatedBy`, or `Compensation.None` with a reason.
- Every operation is idempotent by key: the server stores the key and the result in the same transaction as its effects and returns the stored result if the call is repeated.
- Every client validates the request against the contract before it goes out over the network, and the server always validates again.
- An incompatible change creates a new version of the operation or the event (`.v2`). The previous one coexists while someone uses it.

**From TypeScript to Dart**

1. `pnpm nx run contracts-export:export` writes `backend/libs/contracts/<service>/export/contract.json`: JSON Schema 2020-12 with enums, constants, schemas, routes, operations, events and errors.
2. `dart run contracts_gen` (inside `front/`) reads those JSON files and writes `front/packages/contracts/lib/src/<service>`.
3. `pnpm nx run contracts-export:check` and `dart run contracts_gen --check` fail if what is committed differs from what the TypeScript produces.

A change in `backend/libs/contracts` includes the exported JSON and the regenerated Dart in the same commit. On the front, `ApiClient` validates the request with the generated validator and throws `ContractViolationException` with the same `FieldError` values as the server, without calling the `HttpTransport`.

**Internal API** (`@platform/internal-api`)

```ts
registry.register(RevokeUserSessionsOperation);
router.register(RevokeUserSessionsOperation, handler);
const outcome = await client.call(RevokeUserSessionsOperation, input, {
  idempotencyKey,
});
```

- `ContractRegistry` registers the operations and validates that each `compensatedBy` exists.
- `InternalRouter` is the server side: it validates the input, applies idempotency by tenant, operation and key with a three-state claim, checks deadlines and results against the contract and dispatches to the handler. With the service's `TransactionManager` it stores the result in the same transaction as the effects, in `PostgresIdempotencyStore`.
- `InternalClient` is the client side: it validates the input before calling and applies retries, backoff and a time budget. It only retries `idempotent: true` operations, and only on `transient-failure` or `uncertain`.
- The result is always a `CallOutcome`: `success`, `business-error` (code declared in the contract), `transient-failure`, `uncertain` or `protocol-violation`. The caller decides what to do with each case.
- `traceparent`, tenant and actor are always propagated.
- Today the in-process transport (`InProcessTransport`) exists. The HTTP transport arrives with `@platform/http` in F4 (`POST /internal/operations/:operationId`, with an HMAC signature locally), and the AWS SigV4 signature with phase F12.

**Contract tests.** The CI `contracts` job runs the two `check` commands above, and the schemas are validated in the tests of the service that exposes them and of the one that consumes them. Breaking a contract breaks CI.

## Messaging bus

`libs/platform/messaging` dispatches events and commands without the business knowing whether they go to a topic or a queue. A typed topology is the single source of truth: from it come the runtime dispatch, the infrastructure, the local environment, the tests and the documentation.

| Type    | When                                     | Mechanism                         | Example                                     |
| ------- | ---------------------------------------- | --------------------------------- | ------------------------------------------- |
| Event   | Something happened and others care       | Topic with one queue per consumer | `TasksEvent.TaskUpdated` to `notifications` |
| Command | Requesting work from a specific service  | Queue of the owning service       | `ReportsCommand.GenerateReport`             |
| Query   | Immediate data that is not worth copying | Internal API                      | `TasksOperation.GetTaskSummary`             |

**Topology**

```ts
const tasksEvents = new TopicDef(Topic.TasksEvents);
const reportsCommands = new QueueDef(Queue.ReportsCommands).deadLetter({
  maxReceiveCount: 5,
});

export class PlatformTopology extends Topology {
  topics = [tasksEvents];

  queues = [
    new QueueDef(Queue.NotificationsTasksEvents)
      .subscribesTo(tasksEvents, { types: [TasksEvent.TaskUpdated] })
      .retry(
        RetryPolicy.exponential({
          maxAttempts: 6,
          baseMs: 2_000,
          maxMs: 600_000,
          jitter: true,
        }),
      )
      .deadLetter({ maxReceiveCount: 6, retentionDays: 14 }),
    reportsCommands,
  ];

  routes = [
    Route.event(new TaskUpdated()).to(tasksEvents),
    Route.command(new GenerateReport()).to(reportsCommands),
  ];
}
```

The runtime topology also comes from the contracts with `topologyFromContracts`, and `contracts-export` writes it to `backend/infra/terraform/topology.json`.

**What comes out of the topology**

- **Runtime**: `bus.publish(event)` and `bus.send(command)` resolve the route and use the configured adapter (SNS and SQS on AWS).
- **Terraform**: a command exports the topology to JSON and the module creates topics, queues, DLQs, subscriptions with filters and IAM permissions. Adding a topic connected to three queues means editing this class.
- **Local**: a script creates the same in LocalStack; the tests use an in-memory bus.
- **Documentation**: AsyncAPI.
- **Validation at startup**: each route points to a declared topic or queue and each event has its schema.

**Message format**

Messages follow CloudEvents 1.0, the CNCF specification for provider-independent events. Any external broker or consumer understands them.

```json
{
  "specversion": "1.0",
  "id": "<uuidv7>",
  "type": "tasks.task.updated.v1",
  "source": "/services/tasks",
  "subject": "<taskId>",
  "time": "...",
  "datacontenttype": "application/json",
  "traceparent": "00-<traceId>-<spanId>-01",
  "tenantid": "...",
  "actorid": "...",
  "data": {}
}
```

**Consumers**

- They are declared with `@Subscribe(TasksEvent.TaskUpdated)` in the presentation layer.
- They run on Lambda (batches with partial failures) or on Fargate (long polling) with the same `MessageDispatcher`: it validates the schema, checks idempotency (`processed_messages`), restores `traceId`, tenant and actor, and runs the handler.

**Retries and DLQ**

- Real exponential backoff: the dispatcher computes `base · 2^attempt + jitter` and applies it with `ChangeMessageVisibility`, because SQS on its own retries with a fixed interval.
- Permanent errors (validation, corrupt message) go straight to the DLQ without spending retries.
- Each DLQ has an alarm, a view in the backoffice, and inspection and redrive with `StartMessageMoveTask`.

**Additional guarantees**

- Outbox: the event is stored in the same transaction as the change, published right after the commit, and a periodic sweep picks up anything left behind.
- Ordering per aggregate with FIFO queues and `MessageGroupId = aggregateId` when order matters.
- Claim-check in file storage for messages that exceed the maximum size.
- Delayed messages: `bus.send(cmd, { delay })` uses the queue delay up to 15 min and the scheduler for longer delays.

## Sagas

`backend/libs/platform/saga` coordinates operations between services with a persistent log of each step. If the node running a saga goes down, another one picks it up exactly where it left off, including compensations halfway through. The saga orchestrates; the retries and timeouts of each call belong to the internal API client (ADR 0008 and 0024).

**Definition with classes and contracts**

```ts
export class TenantOnboardingSaga extends SagaDefinition<TenantOnboardingState> {
  readonly type = SagaType.TenantOnboarding;

  protected define(flow: SagaFlow<TenantOnboardingState>): void {
    flow
      .step(CreateTenantOperation)
      .input((s) => ({ name: s.tenantName, ownerId: s.ownerId }))
      .onSuccess((s, out) => {
        s.tenantId = out.tenantId;
      })
      .compensationInput((s) => ({ tenantId: s.tenantId! }))
      .step(OpenBillingAccountOperation)
      .input((s) => ({ tenantId: s.tenantId!, plan: s.plan }))
      .step(AssignShardOperation)
      .input((s) => ({ tenantId: s.tenantId! }))
      .pivot()
      .step(SendWelcomeEmailOperation)
      .input((s) => ({ tenantId: s.tenantId!, ownerId: s.ownerId }));
  }
}

// From a use case, with SagaModule.forFeature([TenantOnboardingSaga]) in the module:
await this.sagas.start(TenantOnboardingSaga, state, { idempotencyKey });
```

Each step receives the `defineOperation` descriptor that the owning service publishes in `@contracts/<service>`. The input and output types come from its zod schemas, and the compensation comes from its `compensatedBy`, so the saga uses the reversals that service already declares. Renaming an operation breaks the build.

**Validations at startup**

- The steps before `pivot()` have a compensation.
- The steps after `pivot()` are idempotent: they are retried until they complete and never trigger compensation.
- Each referenced contract is registered and its reversal exists.

**Log in the database**

Each service that orchestrates stores its log in a `saga` schema inside its shard database, with its own migrations and permissions. That way the saga starts in the same transaction as the local change that causes it, and its data stays in the tenant's region. A database shared by all services would couple them and would be a single point of failure.

| Table                      | Content                                                                                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `saga.instances`           | Saga type, status, `state`, current step, direction, `version`, lease, `next_attempt_at`, deadline, tenant, actor and home tenant, `traceparent`, idempotency key and response channel             |
| `saga.step_log`            | One record per step attempt: operation, direction (forward or compensation), status, key `sagaId:step:direction`, input and output (encrypted when they carry personal data), error code and dates |
| `saga_directory` (catalog) | Where each saga lives: service, tenant, region, logical shard, type and status. No payloads. Support, the backoffice and the status query find any saga by its id without walking shards           |

`TypeOrmSagaStore` from `@platform/adapters-postgres` implements the `SagaStore` port: it stores the instance and its step in the same transaction, and each protected write is an `UPDATE ... WHERE version = :v AND lease_token = :t`. A saga's result goes out through the outbox as an event (`SagaCompleted`, `SagaCompensated`) or through `GET /v1/sagas/{sagaId}`. A job purges finished sagas after the retention period, and a large payload is stored by reference.

**Protocol of each step (write-ahead)**

1. In one transaction: it records the step as `Dispatched` with its key `sagaId:step:direction` and advances the instance `version`.
2. It calls the operation with the internal API client, which applies its own retry and timeout policy.
3. In another transaction: it stores the result, updates the `state` and decides the next step.

If the process dies between step 1 and step 3, the record stays in `Dispatched`. On resume, the saga repeats the call with the same key. The target service returns the stored result if it had already run it, or runs it for the first time. The effect happens only once.

**Recovery**

- Whoever runs a saga takes a 30-second lease and renews it while it works.
- `SagaRecoveryJob` runs every minute and when each instance starts, scheduled with EventBridge on AWS and with cron locally. It walks the shards with `AcrossShards`, takes with `FOR UPDATE SKIP LOCKED` the active sagas with an expired lease or a due `next_attempt_at`, and resumes them from the log. The owning service resumes it, without depending on whoever invoked it.
- Asynchronous steps (response through a queue) stay in `WaitingReply`, correlated by the key. If the response takes longer than the contract declares, recovery resends the command with the same key.

**How it reacts to each result**

| Client result      | Going forward                                                                                                                                           | During compensation                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `Success`          | Next step                                                                                                                                               | Next compensation                                            |
| `BusinessError`    | Before the pivot, starts compensation in reverse order. After the pivot, `RequiresIntervention` status                                                  | `CompensationFailed` status, alert and manual intervention   |
| `TransientFailure` | `Suspended` status; recovery resumes it later. When the saga's deadline is reached, it compensates                                                      | `Suspended` status; recovery keeps trying until it completes |
| `Uncertain`        | `Suspended` status with `PLATFORM.SAGA.UNCERTAIN_OUTCOME`; it is retried with the same key. When the deadline is reached, it compensates from that step | `Suspended` status; recovery keeps trying until it completes |

A step has an uncertain result when the call exceeds `maxStepDurationMs` (25 seconds by default) or ends by timeout or cancellation. If the suspension exceeds 20 attempts or 24 hours, the saga moves to `RequiresIntervention` (ADR 0008).

Compensations are idempotent and tolerate the case where the original operation was never applied (they respond success without doing anything). That is why a step with an uncertain result can be compensated safely.

**Isolation.** While the saga runs, the resources involved stay in an intermediate domain state (for example, tenant `Provisioning`) so that nobody uses them half-done.

**Operation and visibility**

- The backoffice shows the timeline of each saga with its steps, inputs, outputs and errors, linked by `traceId`.
- Audited manual actions: retry a step, force compensation, mark as resolved with a reason.
- Events `PlatformEvent.SagaCompleted`, `SagaCompensated` and `SagaCompensationFailed`; metrics for duration and stuck sagas; alarm on `CompensationFailed`.

**Example sagas**: tenant onboarding, account deletion across all services (habeas data) and moving a tenant between shards.

Simple flows, with no need to undo, remain as event choreography.

**Status and next step.** Today `@platform/saga` brings the complete protocol (write-ahead, lease, pivot, uncertain result, recovery) on top of the `SagaStore` port, with `InMemorySagaStore` and the `CrashingSagaStore` double from its tests. The next phase is package P3 of the persistence design: `SagaInstance` as an aggregate with pure transitions, the collaborators `StepExecutor`, `CompensationRunner`, `LeaseKeeper`, `SagaRecoveryJob` and `SagaEventPublisher`, a small `SagaEngine` with `start` and `resume`, and `SagaModule`. `TypeOrmSagaStore` arrives with P2. The AWS Step Functions alternative was discarded: it ties the platform to AWS, limits the payload to 256 KB and charges per transition.

## Shared capabilities

**Files**

The `FileStorage` port offers `put`, `get` (stream), `head`, `delete`, `createUploadUrl`, `createDownloadUrl` and multipart upload. The `files` service stores the metadata and exposes the flow.

1. `POST /files/upload-intents` with name, type and size. Responds `{ fileId, uploadUrl, headers, expiresAt }`.
2. The client uploads directly to the URL.
3. The storage event (or `POST /files/{id}/complete`) triggers the size, type and checksum verification, and the malware scan.
4. The file moves from `PendingUpload` to `Ready` (or `Rejected`) and `FilesEvent.FileReady` is published.

- With S3, the URL is presigned by S3.
- With a provider without presigned URLs, the adapter returns a URL of the `files` service itself with an HMAC token that fixes expiration, size and type; `files` receives the stream and writes it to storage. For the client the flow is identical.
- Downloads with a short-lived signed URL, or a stream through the API for small private files.
- Metadata: tenant, owner, key, size, type, checksum, status and retention. The size and quota limits come from the tenant's plan.

**Scheduled jobs**

```ts
@ScheduledJob({ id: JobId.PurgeLoginAttempts, cron: '0 3 * * *', timezone: 'America/Bogota' })
export class PurgeLoginAttemptsJob implements JobHandler { ... }

await this.scheduler.scheduleOnce(JobId.ExpireTrial, at, { tenantId });
```

- The `JobScheduler` port covers recurring and one-time jobs. On AWS, EventBridge Scheduler publishes to a queue; locally, `node-cron`.
- A distributed lock in Valkey prevents double executions.
- `job_runs` table: status, duration, error and `traceId`. View and manual execution in the backoffice.
- Included jobs: future partitions, retention purge, billing period close, saga recovery, outbox sweep, deprecation notices.

**Feature flags**

- OpenFeature as the standard port. In-house default provider (definitions in the database, cache in Valkey); AppConfig or flagd as alternatives.
- Targeting by tenant, plan, user, group and percentage.
- Flags as an enum (`Flag.NewReports`) and use in endpoints: `@Endpoint({ flag: Flag.NewReports })`.
- The log level is also controlled by a flag.

**Webhooks and signatures**

- Reusable `SignatureVerifier` utility with interchangeable schemes (`SignatureScheme.HmacSha256`, `StandardWebhooks`, per-provider schemes). It validates signature, time window and nonce in Valkey against replays.
- **Incoming webhooks**: an endpoint is marked with `@Endpoint({ auth: AuthMethod.Signature, signature: SignatureScheme.HmacSha256 })`. Only the services that need them declare them.
- **Outgoing webhooks** (optional module): tenants register URLs and events of interest; deliveries follow the Standard Webhooks specification (`webhook-id`, `webhook-timestamp`, `webhook-signature`), with exponential retries through a queue, a record of each delivery, deactivation after repeated failures and secret rotation.

## Notifications

The `notifications` service handles every channel with a single entry point: `notify(userId, NotificationType.SecurityNewDeviceLogin, data)`. The type defines the criticality; the user's preferences define the channels. Security alerts always go out by email and push.

**Email**

- `EmailSender` port; SES adapter on AWS and SMTP with Mailpit locally.
- Terraform configures the domain, DKIM, SPF, DMARC and a configuration set that sends SES events to the bus.
- Versioned templates with React Email or MJML, with i18n and preview.
- Security emails without tracking. Bulk emails with one-click `List-Unsubscribe`, a Gmail and Yahoo requirement.
- Automatic suppression list for bounces and complaints.

**Record of each email** (`email_messages` and `email_events`)

| Event                                                        | Source                                                                                   |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Sent, delivered, bounce, complaint, reject, delivery delayed | Provider events                                                                          |
| Opened (first time and count)                                | Tracking pixel. Apple Mail downloads it automatically, so it is an approximate indicator |
| Click                                                        | Tracked links                                                                            |

Each record stores tenant, user, template and version, recipient, provider id, `traceId` and the dates of each event. Closing an email is outside what an email client reports. Retention is configurable.

**Push from our server**

- Direct connection with APNs (iOS, `.p8` token), FCM HTTP v1 (Android) and Web Push with VAPID (browsers). No intermediaries such as OneSignal.
- On mobile, the operating system requires going through APNs or FCM. With the app open, WebSocket is used.
- Push tokens bound to `devices`, cleaned up when the provider reports them as invalid.
- Record of sending, delivery and opening (the app reports the opening).
- The MFA push opens the verifier app on the code screen.

**Realtime: Socket.IO and SSE**

`apps/realtime` is a NestJS gateway on Fargate, behind an ALB, with two channels fed by the same message source:

| Channel                         | Direction             | Use                                                                                                   |
| ------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| Socket.IO (`@WebSocketGateway`) | Bidirectional         | Screens that send and receive: collaboration on tasks, confirmations, presence                        |
| SSE (`@Sse()`)                  | From server to client | Notifications, job status, MFA code. It is plain HTTP, goes through proxies and reconnects on its own |

- Authentication with the JWT in the Socket.IO handshake and with the session cookie in SSE. Rooms per user, tenant and resource.
- Horizontal scaling with the Socket.IO adapter on Valkey. The transport is WebSocket only, so the load balancer does not need sticky sessions.
- Recovery after a disconnection: Socket.IO uses _connection state recovery_ and SSE uses `Last-Event-ID`. Both replay the messages of the last few minutes from a Valkey Stream, so an MFA code arrives even if the connection dropped.
- `notifications` decides what to send; `realtime` only delivers. The business uses the `RealtimeGateway` port.

**Push inside and outside the app**

SSE and Socket.IO deliver while the app or the tab is open: that is the in-app push. With the app or the browser closed, the operating system only wakes the app through its native push service. `notifications` picks the channel according to the presence that the gateway records in Valkey:

| User state        | Channel                                |
| ----------------- | -------------------------------------- |
| App or tab open   | SSE or Socket.IO                       |
| Web closed        | Web push via FCM with a Service Worker |
| Mobile app closed | APNs (iOS) or FCM (Android)            |

Security alerts go out on every channel at once. Each notification stays in the persistent inbox with a read or unread status, and the per-type and per-channel preferences and quiet hours apply.

## Plans, metering and billing

The `billing` service computes what each tenant must pay and tracks the status of each invoice. Payment collection is a separate process that connects through a port and moves those statuses.

| Component     | What it does                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plans         | Versioned catalog with price, frequency, included features (`Feature`) and limits (`Quota`)                                                             |
| Subscriptions | Tenant, plan, current period and status (`Trialing`, `Active`, `PastDue`, `Suspended`, `Canceled`)                                                      |
| Metering      | Services publish `BillingEvent.UsageRecorded` with metric, quantity and idempotency key; `billing` aggregates per tenant and period                     |
| Entitlements  | `@Endpoint({ entitlement: Feature.Webhooks })` and quota checks with a cache in Valkey; when the limit is exceeded it responds `BILLING.QUOTA.EXCEEDED` |
| Invoices      | A job closes each period and generates the invoice (`Draft`, `Issued`, `Paid`, `Failed`, `Void`) with its fixed charge and usage lines                  |
| Collection    | `PaymentProvider` port and internal operations `BillingOperation.MarkInvoicePaid` and `MarkInvoiceFailed`, so the external process reports results      |

- Money in integers of the minimum unit with its currency.
- Delinquency cycle: `Failed` moves the subscription to `PastDue`; after the grace period, to `Suspended`, which publishes an event and `identity` suspends the tenant.
- Plan changes with proration and an event that updates the entitlements instantly.
- `billing` invoices are internal collection documents. The electronic invoice before the DIAN is issued in the integration with the payment and invoicing provider.

## AWS infrastructure and CI/CD

The infrastructure lives in `backend/infra/terraform` and is organized as in the Solventa project: reusable modules, stacks with their own state and values per environment (ADR 0020). Deploying a service only plans its stack.

| Stack                       | Resources                                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `network`                   | VPC with public, private and data subnets, NAT according to `egress`, VPC endpoints and flow logs                                                                                 |
| `platform`                  | Alarm topic and budget; ECS cluster; OpenObserve; HTTP API Gateway with its origin authorizer; internal ALB for Fargate APIs and VPC link; public realtime ALB; files bucket; SES |
| `data`                      | RDS PostgreSQL with RDS Proxy and replicas, one database per shard of each service and the catalog; Valkey; client security group                                                 |
| `messaging`                 | Topics, queues and DLQs read from `topology.json`, and the SES events queue                                                                                                       |
| `edge`                      | CloudFront with WAF for the Flutter web and the API, and the DNS records                                                                                                          |
| `service` (one per service) | API on Lambda or Fargate and its routes, realtime, Fargate workers, Lambda consumers, IAM derived from the topology, logs and alarms                                              |

**Regions and environments.** Environments `local` (LocalStack), `dev`, `staging` and `prod`. The key of each state is `<region>/<stack>/terraform.tfstate`: another region is another set of states with the same code. The global catalog lives in the main region with read replicas in the others. The deployment order is network, platform, data, messaging, edge and then each service.

- **Runtime per service:** each service's API chooses `runtime = "lambda"` (HTTP API Gateway) or `"fargate"` (internal ALB behind the VPC link). In both cases it comes in through the same HTTP API, behind CloudFront and its WAF, and an authorizer requires the `X-Origin-Verify` header. Realtime always runs on Fargate behind the public ALB.
- **Data:** one RDS instance per region with one database per logical shard of each service (`<service>_shard_<n>`) and the `catalog` database. Each service has its own role and its own secret with rotation; it writes through RDS Proxy and reads directly from the replicas. The parameter group enables logical replication for shard moves.
- **Valkey:** IAM authentication with one user per service limited to its prefix. With F4, the ACL adds the shared `auth:*` space: identity writes it and the other services read it (ADR 0022).
- **Least privilege:** the messaging permissions come from the topology's `producers` and `consumer`; each worker and each consumer consumes only its own queue.
- **Network:** the `egress` variable decides the outbound path of the private subnets (ADR 0016). The data subnets reach AWS only through VPC endpoints.
- **Costs:** monthly budget with AWS Budgets and alerts at 80% and 100%. Backups with PITR in RDS.
- **Validation:** each stack has `terraform test` tests with mocked providers, and CI runs `tflint`, `shellcheck` and Trivy.

**Deployment pipeline (phase F12, GitHub Actions with OIDC to AWS, on top of `deploy-aws.sh`)**

1. `terraform plan` of the affected stacks and services as a comment on the PR.
2. On merge, migrations of each affected service on all its shards, as a one-off task on Fargate.
3. `terraform apply` of the service stack with its image or its bundle (`TF_VAR_image`, `TF_VAR_lambda_package`).
4. Smoke tests against the environment and promotion from `staging` to `prod` with manual approval.

**Local development** in two modes, possible thanks to the ports:

| Mode         | Adapters                                                                                                             | What for                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `local`      | In memory, Postgres, Valkey, MinIO, Mailpit, `node-cron`, `ws`                                                       | Fast daily development, without AWS          |
| `localstack` | AWS adapters against LocalStack, the local AWS simulator (SQS, SNS, S3, EventBridge Scheduler, SES, Secrets Manager) | Testing the AWS integration before deploying |

`backend/docker-compose.yml` starts PostgreSQL with pgvector (databases `catalog`, `identity_shard_0`, `identity_shard_1` and `tasks_shard_0`), Valkey with the Bloom module, LocalStack, Mailpit, OpenObserve and an OpenTelemetry Collector. The images are pinned by digest and the ports are only published on `127.0.0.1`. At startup, LocalStack creates the queues, DLQs, topics and subscriptions from `topology.json`. The Terraform `local` environment applies `platform` and `messaging` against LocalStack to test the Terraform before AWS.

## Quality and security

**Tests** (Jest with `@swc/jest` in the backend, `flutter test` in the front)

| Type        | What it covers                                              | How                                                                                    |
| ----------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Unit        | Domain and use cases                                        | Doubles of each port as classes; deterministic `IdGenerator` and clock                 |
| Integration | Repositories, migrations, partitions, RLS, cache, consumers | Real Postgres and Valkey with Testcontainers                                           |
| E2E         | Complete endpoints, auth and MFA flows, sagas               | Native `fetch` against `app.listen(0)`, with an in-memory bus                          |
| Contract    | Operations and events between services                      | Schema validation in producer and consumer, and `check` of the generated JSON and Dart |

- Minimum backend coverage validated in CI: 80% for lines, statements and functions, and 75% for branches, per project.
- Saga recovery tests: `CrashingSagaStore` simulates the process crashing at each point of the protocol and the test verifies that the saga ends with a single effect.

**Where the tests go**

- Backend: in the `__tests__/` folder of the folder they test, unit tests in `*.spec.ts` and integration tests in `*.int-spec.ts`. The `backend/jest.preset.js` preset only looks there, and each project has its own `jest.config.cjs`.
- The doubles and the shared support go in `__tests__/utils/`. If another library uses them, they are exported with the `@platform/<lib>/test-utils` alias.
- Type checking runs separately, in the `typecheck` target, and also checks the tests.
- Front: in the `test/` of each package with the folders of `lib/src`. What one package shares goes in its `test/utils/`, and what is shared between packages goes in `front/packages/test_utils`, only in `dev_dependencies`.
- A hook in `.claude/` and an ESLint rule reject a backend test outside `__tests__/`.

**Load tests with k6**

- Scripts in `tests/load/` per flow: login with the device's automatic code, session refresh, tasks CRUD, file upload and event processing.
- Constant load, spike and soak scenarios, with thresholds (p95 latency, error rate) that make the run fail.
- The results are sent to the OpenTelemetry backend to see them next to the traces.
- They run every night against staging and before each major release.

**Code standards**

- TypeScript with `strict: true` and ESM with `module: nodenext`; relative imports end in `.js`. ESLint with flat config and Prettier. Dart is formatted with `dart format` and analyzed with `flutter analyze`.
- Husky with lint-staged and commitlint.
- Boundaries between projects with Nx tags; `dependency-cruiser` checks the layers from the first service on.
- The service, module and microfrontend generators arrive with phase F11. In the meantime, the `backend-estructura` skill and ADR 0015 set the structure.
- AI tooling in `.claude/`: backend and front skills with the current rules, hooks that reject forbidden paths, format and run the structure scripts, and guide and implementer agents to split the work into packages.

**Security in CI**

- `security.yml` runs gitleaks over the whole history, dependency-review on PRs, OSV-Scanner on `pnpm-lock.yaml` and `front/pubspec.lock`, Trivy on the Terraform and CodeQL for TypeScript. Renovate keeps the dependencies and the action SHAs up to date.
- Mandatory review of the access matrix when a PR adds a public endpoint.

**Repository documentation**: README, `docs/ARCHITECTURE.md` (the version of this plan inside the repository), ADRs for each architecture decision, per-phase designs in `docs/design/`, quality audits in `docs/audits/`, contribution and local development guide. The key rotation runbook arrives with F4 (WP15). The runbooks for DLQs and stuck sagas and the guide for creating a new service arrive with F11, the generators and documentation phase.

## Construction phases

Construction moves forward in six stages. Each stage depends on the previous one and, within a stage, the phases move forward in parallel.

&#91;embedded content: roadmap · 6 stages, 13 phases\]

The infrastructure of each piece is added in its own phase; F12 completes the per-service Terraform and the deployment pipeline. Real sharding goes in the final stage because the `ShardRouter` exists since F2 and adding shards later leaves the business code intact.

**Where construction stands** (November 14, 2026)

| Phase or workstream                         | Status                                                                                                                                                                                  | Reference                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| F0 and F1                                   | Built: Nx monorepo, `kernel`, `config`, `observability`, `@contracts/platform`, local environment and CI                                                                                | Commit `df81442`                                                                |
| F2 and F3                                   | Libraries built: `sharding`, `cache`, `bloom`, `resilience`, `criteria`, `messaging`, `internal-api`, `saga` and persistence on `pg`, plus the front with its shells and microfrontends | Commit `9afa085`                                                                |
| Persistence on TypeORM and persistent sagas | Design approved. Next phase: packages P1, P2 and P3                                                                                                                                     | `docs/design/persistencia-typeorm-y-sagas.md`, ADR 0024                         |
| F4 · Identity                               | Design approved with fifteen work packages in three waves. Built: `@platform/rate-limit` and `ValkeyRateLimiter` (WP3)                                                                  | `docs/design/f4-identity.md`, ADR 0022 and 0023                                 |
| Quality review of November 14               | Applied in the libraries, the infrastructure and the front (commits `c9614cb`, `b55d566` and `6cb8ebd`)                                                                                 | `docs/audits/2026-11-14-calidad.md`                                             |
| Review of the backend and front libraries   | Plans by work packages: P0 to P6 in the backend and WP1 to WP11 in the front                                                                                                            | `docs/audits/2026-11-14-revision-backend.md` and `2026-11-14-revision-front.md` |

## Decisions

**Made**

| Topic                        | Decision                                                                                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack                        | NestJS, TypeORM, PostgreSQL, Node 24 (24.22.2 in `.nvmrc`), strict TypeScript                                                                                                                       |
| Repository                   | Complete rewrite of `node_template` as an Nx monorepo with a minimal root, `backend/` (pnpm, a single `node_modules`, libraries by alias without `package.json`) and `front/` (pub workspace)       |
| Identifiers                  | UUIDv7 everywhere, including the `traceId`                                                                                                                                                          |
| Observability                | OpenTelemetry with OpenObserve as the only tool for logs, metrics and traces                                                                                                                        |
| Authentication               | In-house: 10 to 15 min ES256 JWT with `typ: at+jwt` and a rotating opaque session token; argon2id from `node:crypto`, password of at least 12 characters                                            |
| Session                      | Expires after 1 day without activity; each refresh while the app is in use extends the window, with an absolute cap of 30 days                                                                      |
| MFA                          | Mandatory when registering any device; on every login only for administrators. The registered device generates its 8-digit code automatically; the first device is validated with 6 digits by email |
| Passkeys                     | From the first version                                                                                                                                                                              |
| Recovery without a device    | By email with alerts and an exponential wait: 24 h, 48 h, 96 h                                                                                                                                      |
| Cache and short-lived data   | Valkey                                                                                                                                                                                              |
| Messaging                    | Abstract topics and queues with a typed topology and CloudEvents format; SNS and SQS as the AWS adapter                                                                                             |
| Consistency between services | Orchestrated sagas with a persistent log in the `saga` schema of the orchestrator's shard, a directory in the catalog and recovery; retries and timeouts in the client                              |
| Contracts                    | TypeScript with zod per service, exported to JSON and generated in Dart; validation before calling and a declared reversal per operation                                                            |
| Platform                     | Agnostic: endpoints, events, jobs and realtime with one inbound adapter per runtime                                                                                                                 |
| Sharding                     | Logical shards in groups per tenant, key chosen per service or entity, moves without interruption with logical replication, operations as code. It debuts in identity                               |
| Errors                       | `SERVICE.SUBMODULE.ERROR` codes and RFC 9457                                                                                                                                                        |
| Versioning                   | Major in the URL, version by header with transformers, deprecation with `Sunset`                                                                                                                    |
| Auditing                     | Per-entity triggers with the session's actor, tenant and `traceId`                                                                                                                                  |
| Billing                      | Plans, metering and internal invoices; payment collection connected through a port                                                                                                                  |
| Tests                        | Jest (unit, integration, e2e) with Testcontainers, k6 for load, LocalStack for local AWS                                                                                                            |
| Realtime                     | Socket.IO and SSE in NestJS on Fargate, with message recovery from Valkey                                                                                                                           |
| Push                         | SSE or Socket.IO with the app open; Web Push, APNs or FCM with the app closed                                                                                                                       |
| Account lockout              | Exponential lockout per origin, protected mode per account and IP lockout                                                                                                                           |
| Token invalidation           | Revoked session, user and tenant epochs, permissions version and key removal                                                                                                                        |
| Search                       | Hybrid in PostgreSQL: full text and pgvector                                                                                                                                                        |
| AI                           | In-house module in NestJS with LLM and embedding ports; Claude as the default provider                                                                                                              |
| Resilience                   | In-house policies (circuit breaker and bulkhead on top of `Clock`) and Bloom filters on Valkey                                                                                                      |
| Agreements                   | Generic service for terms, consents and signed documents                                                                                                                                            |
| Data residency               | Each tenant chooses a country or region; full stack per region and a global catalog with routing data only                                                                                          |
| Tenants                      | Every user belongs to a tenant; end customers can share one                                                                                                                                         |
| Database                     | RDS PostgreSQL with TypeORM and an in-house layer for logical and physical sharding and query routing (ADR 0024)                                                                                    |
| Client apps                  | front/ folder with two Flutter shells (web and mobile) that compose per-domain microfrontends shared by both                                                                                        |
| Client framework             | Flutter for mobile, web and backoffice, with HTTP client (`api`), contracts, authentication and shared widgets in Dart; shared test doubles in `test_utils`                                         |
| Endpoints                    | `@Endpoint(route)` takes method, path, schemas, codes and access from the contract; OpenAPI is generated from `contract.json` in F11, without `@nestjs/swagger`                                     |
| Session channel              | The mobile app declares its channel by header (`Authorization: Bearer` or `X-Session-Transport: bearer`); without a header the channel is web and the token travels in the `__Host-session` cookie  |
| Shared revocation            | Revocation state in the `auth:*` space of Valkey: identity writes and the other services read (ADR 0022)                                                                                            |
| Identity data                | User data in the user's shard within the group of their home tenant; tenant data in the tenant's shard (ADR 0023)                                                                                   |
| External dependencies        | Built in-house on top of `node:crypto` and the standard library; a library comes in only when reimplementing it is unwise or costly, as with NestJS and `@simplewebauthn/server`                    |
| Test structure               | Backend: `__tests__/` next to the code and utilities in `__tests__/utils/`. Front: `test/` of each package, `test/utils/` and the `test_utils` package                                              |
| Infrastructure               | Terraform by stacks with a selectable runtime per service (Lambda or Fargate), local, dev, staging and prod environments, and one database per shard of each service plus the catalog (ADR 0020)    |
| AI tooling                   | Backend and front skills, hooks and the agent troop in `.claude/`                                                                                                                                   |

**Pending**

All the decisions of the plan are made. Those that come up during construction are recorded as ADRs in the repository.

## Scope of later phases

The plan covers the complete backend. These pieces are built on top of it in later phases:

- **Clients**: the business screens of each microfrontend, built on the skeleton, the ApiClient and the authentication the monorepo already brings.
- **Real payment collection and electronic invoicing**: integration with the payment gateway and with a provider authorized by the DIAN, connected to the `PaymentProvider` port.
- **DPoP on all tokens**: binding the access token and the session token to the key of the registered device.
- **Analytics**: exporting events to a data lake for business reports.
- **Advanced observability**: SLOs per service, alerts on those SLOs and business dashboards.
- **Resilience**: disaster recovery between regions and chaos testing.
- **Sharding tooling**: automatic rebalancing of logical shards according to load.
