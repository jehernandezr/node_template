# Design of phases F5 to F11: example services, business and scale

- Status: Approved on 2026-11-16, with the recommendation of each decision in section 15
- Date: 2026-11-16
- Historical design: where it differs, the ADRs from 0030 on and the [F12 plan](../plan/f12-infra-and-deployment.md) win. In particular section 10 (per-queue workers, a public real-time ALB, deploy order) gives way to [ADR 0039](../adr/0039-runtime-matrix-per-service.md), [ADR 0043](../adr/0043-deploy-migrations-and-rollback.md) and [ADR 0045](../adr/0045-edge-domains-and-real-time.md); sections 2.1, 3.5 and 15 (cookie auth for real time, `INTERNAL_API_SIGNER`) give way to ADR 0045 and [ADR 0040](../adr/0040-internal-routing-and-authentication.md); sections 3.2 and 8.4 (a shared, global catalog) give way to [ADR 0042](../adr/0042-region-and-catalog-model.md); and the `NODE_ENV` gates give way to `DEPLOY_ENVIRONMENT` ([ADR 0046](../adr/0046-providers-and-telemetry-per-environment.md)).
- Related ADRs: [0007](../adr/0007-messaging-typed-topology-sns-sqs-cloudevents.md), [0008](../adr/0008-orchestrated-sagas-persistent-log.md), [0010](../adr/0010-logical-sharding-region-residency.md), [0011](../adr/0011-real-time-socketio-sse.md), [0013](../adr/0013-ai-module-ports-claude.md), [0014](../adr/0014-agreements-signed-documents.md), [0020](../adr/0020-terraform-stacks-and-runtime-per-service.md), [0023](../adr/0023-identity-data-routing.md), [0024](../adr/0024-typeorm-persistence-sharding-persistent-sagas.md), [0025](../adr/0025-nestjs-layer-per-sub-entry-abstract-ports.md) and [0026](../adr/0026-scheduled-jobs-scheduledjob-joblock.md)

This document splits the construction of the `tasks`, `notifications`, `reports` and `billing` services, their screens, the example sagas, real sharding and the generators across the troops of waves 5 to 7 of the [plan](../plan/README.md#execution-order-by-waves). It contains no production code: it fixes names, folders, contracts, tables, events, queues, permissions, packages and decisions. It follows the format of the [F4 design](f4-identity.md) and does not repeat what that document already fixes: the structure of a service ([section 4](f4-identity.md#4-structure-of-backendappsidentity)), the platform pieces ([section 3](f4-identity.md#3-new-platform-pieces)) and the package rules ([section 6](f4-identity.md#6-work-packages)).

Where this document and an ADR contradict each other, the ADR wins, except for what section 15 proposes to change. The demo data of the microfrontends is the source of what the contracts ask for: no fields or screens that do not exist today are added, except those that section 15 approves.

## 1. Starting point and scope

### 1.1 Starting state (wave 5, with wave 4 integrated)

| Piece          | State                                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contracts      | Only `@contracts/platform` (kit, `MoneyAmount`, `PageQuerySchema`, `PLATFORM.*` catalog) and `@contracts/identity`. There is no contract for `tasks`, `notifications`, `reports` or `billing`.                                        |
| Platform       | `kernel`, `config`, `observability`, `persistence` (TypeORM), `sharding`, `messaging`, `internal-api`, `saga` (engine with persistent log), `scheduling` (`ScheduledJob`), `cache`, `bloom`, `rate-limit`, `resilience` and adapters. |
| F4             | With wave 4: `@platform/auth` and `@platform/service`. Wave 5 brings `@platform/http` and the identity skeleton; wave 6, the identity modules.                                                                                        |
| Local env      | `catalog`, `identity_shard_0`, `identity_shard_1` and `tasks_shard_0` on Postgres 17 with `vector`; Valkey, LocalStack (SNS, SQS, SES, S3, scheduler), Mailpit and OpenObserve.                                                       |
| Terraform      | Stacks `network`, `platform`, `data`, `messaging`, `edge` and `service` (instantiated per service in `environments/<environment>/services/<service>/`).                                                                               |
| Front          | `tasks`, `notifications`, `billing`, `verifier`, `assistant`, `account` and `backoffice` with `Fake*` repositories and `RepositoryBinding.demoOnly`. There is no `reports` microfrontend.                                             |
| `backend/apps` | Only what waves 4 and 5 build (identity) exists. Nothing of the four services.                                                                                                                                                        |

### 1.2 Scope per phase

| Phase | In scope                                                                                                                                                                                                                                | Wave                      | Out of scope (see section 14)                                     |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| F5    | `tasks` service (CRUD, search with `@platform/search` in text or hybrid mode, user data deletion) and the capabilities: feature flags (`@platform/flags`, `features` and `flags` on the route) and jobs on the existing `ScheduledJob`. | 5, 7                      | Files, outgoing webhooks                                          |
| F6    | `notifications` service: inbox, preferences, dispatch per channel, email (SES or SMTP), push through ports with fakes, and real time with `@platform/realtime` (SSE, Socket.IO or both), inside the service or in `apps/realtime`.      | 5, 7                      | Real push (APNs, FCM, Web Push), SES bounce events                |
| F7    | `reports` service (report catalog, runs, event-driven projections) and the example sagas `TenantOnboarding` and `DeleteAccount`.                                                                                                        | 5, 8                      | PDF and XLSX, platform reports in backoffice                      |
| F8    | `billing` service: plans, subscriptions, metering, entitlements, quotas, invoices, delinquency and a `PaymentProvider` port with a fake. Metering from the services.                                                                    | 5, 8                      | Real charging, electronic invoicing with the DIAN                 |
| F9    | Screens of `tasks`, `notifications`, `billing` and a new `reports` microfrontend against the real API, with the Dart from wave 5. `backoffice` and `assistant` keep demo data.                                                          | 9                         | New screens that do not exist today                               |
| F10   | Multiple regions (registration, regional URL, `WRONG_REGION`), `MoveTenant` between groups and regions, and two shards per service locally and in tests.                                                                                | 9                         | Automatic rebalancing, cross-region disaster recovery             |
| F11   | Service and module generators, OpenAPI from `contract.json`, WP15 of F4 and the documentation of what was built.                                                                                                                        | 9                         | Documentation portal                                              |
| F12   | Pipeline with OIDC to AWS, publishing of the web and the mobile app, Lambda entry point and SigV4 signing (wave 5, troop 3); tfvars, runtime and stack per service (wave 6).                                                            | 5 and each service's wave | Nothing from F12: what follows is in the later list of the README |

## 2. Key decisions

0. **The template offers the alternatives, it does not choose for the user.** Each technology that an ADR or ARCHITECTURE names as an option is a port (abstract class) with one adapter per alternative, and whoever uses the template chooses by configuration or by tfvars, per service. The template ships all those adapters tested. Only those that require the user's external accounts (APNs, FCM, Web Push) or a module that no phase of this document builds remain as a port with a fake. Table 2.1 lists the alternatives.

1. **All contracts in wave 5, a single troop.** A contract depends only on the kit. The routes, operations, events, commands, queues and errors of the four services, plus what identity needs for the sagas, go in together with their Dart and their ARB texts. The services of wave 6 do not edit contracts (decision 7 of [F4](f4-identity.md#2-key-decisions)).
2. **Each service is an app with the F4 structure.** `bootstrapHttp` and `bootstrapWorker` from [`@platform/service`](f4-identity.md#35-platformservice-bootstrap), modules with the four layers, abstract facades and fakes in `modules/<m>/__tests__/utils/`. A module imports only the `index.ts` of another one.
3. **Tenant data in the tenant's shard, user data in the user's shard** ([ADR 0023](../adr/0023-identity-data-routing.md)). `tasks`, `billing` and `reports` use `ShardKey.Tenant`. The inbox and preferences of `notifications` use `ShardKey.User` with the user's `homeTenantId`, so every event that names a user carries its `UserRef` (`{ userId, homeTenantId }`).
4. **Services do not read each other's database.** They talk through internal operations with declared compensation, through events and through commands. `reports` builds its own projections from events and, to fill in history, calls a paginated read operation of the data owner.
5. **Access by route.** New permissions, plan features and flags are declared with `Access.authenticated({ permissions, features, flags })` on the contract route (like step-up in F4), and `evaluateAccess` checks them with the `AccessGrant` that already carries `features` and `flags`. No new options in `@Endpoint`.
6. **Metering as a command.** Services send `billing.usage.record.v1` to the `billing` queue. The kit requires the owner of an event to be the one who publishes it, so the architecture's `BillingEvent.UsageRecorded` becomes a command (decision 12 of section 15).
7. **Runtime selectable per service** ([ADR 0020](../adr/0020-terraform-stacks-and-runtime-per-service.md)). Each service ships `main.ts` (Fargate) and `lambda.ts` (Lambda) on `@platform/service`; `api.runtime` in its tfvars chooses. The template's default value is `fargate`.
8. **In-house except for third-party protocols.** Our own code goes on the standard library. The new dependencies are the SES client and Socket.IO with its streams adapter (section 13), because reimplementing the Socket.IO protocol is unwise.

### 2.1 Alternatives the template ships

| Piece                        | Port                                       | Adapters                                                                                                            | How it is chosen                      | Source                                                       |
| ---------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| Real time                    | `RealtimeTransport`                        | `SseTransport`, `SocketIoTransport` (Valkey streams to scale and recover)                                           | `REALTIME_TRANSPORTS` (one or both)   | [ADR 0011](../adr/0011-real-time-socketio-sse.md)            |
| Real-time channel credential | `StreamAuthenticator`                      | `BearerStreamAuthenticator` (access token), `CookieStreamAuthenticator` (session cookie, verified against identity) | `REALTIME_AUTH`                       | ADR 0011                                                     |
| Location of real time        | `RealtimeModule` from `@platform/realtime` | mounted inside a service or in `apps/realtime`                                                                      | `app.module.ts` of the service or app | ADR 0011                                                     |
| Runtime                      | `bootstrapHttp`, `bootstrapLambda`         | Fargate, Lambda                                                                                                     | `api.runtime` in tfvars               | ADR 0020                                                     |
| Internal call signing        | `InternalRequestSigner`                    | `HmacSigner`, `SigV4Signer`                                                                                         | `INTERNAL_API_SIGNER`                 | ARCHITECTURE                                                 |
| Search                       | `SearchIndex`                              | `PostgresTextSearch` (`tsvector`), `PostgresHybridSearch` (pgvector and `EmbeddingProvider`)                        | `SEARCH_MODE`                         | ARCHITECTURE                                                 |
| Email                        | `EmailSender`                              | `SesEmailSender`, `SmtpEmailSender`, `InMemoryEmailSender`                                                          | `NOTIFICATIONS_EMAIL_SENDER`          | ARCHITECTURE                                                 |
| Email templates              | `TemplateRenderer`                         | `TypeScriptTemplateRenderer`                                                                                        | only one; the port allows others      | this design                                                  |
| Push                         | `PushSender`                               | `InMemoryPushSender`, `NonePushSender` (APNs, FCM and Web Push require the user's accounts)                         | `NOTIFICATIONS_PUSH_SENDER`           | ARCHITECTURE                                                 |
| Flags                        | `FlagStore`                                | `ConfigFlagStore`, `InMemoryFlagStore`                                                                              | `FLAGS_STORE`                         | this design                                                  |
| Report results               | `ReportResultStore`                        | `RowReportResultStore`; S3 arrives with `files`                                                                     | `REPORTS_RESULT_STORE`                | this design                                                  |
| Tenant move                  | `TenantDataTransfer`                       | `BatchCopyTransfer` (batches and delta rounds), `LogicalReplicationTransfer` (PostgreSQL logical replication)       | `TENANT_MOVE_STRATEGY`                | [ADR 0010](../adr/0010-logical-sharding-region-residency.md) |
| Write lock during the move   | `TenantWriteGate`                          | `DirectoryWriteGate` (shard directory), `ValkeyWriteGate` (lock in Valkey)                                          | `TENANT_WRITE_GATE`                   | ADR 0010                                                     |
| Charging                     | `PaymentProvider`                          | `FakePaymentProvider`, `NonePaymentProvider` (the real one arrives after F12)                                       | `BILLING_PAYMENT_PROVIDER`            | ARCHITECTURE                                                 |

The `EmbeddingProvider` of hybrid search ships a deterministic fake; the real adapter arrives with the AI module ([ADR 0013](../adr/0013-ai-module-ports-claude.md)).

## 3. What the four services have in common

### 3.1 Anatomy

Each service follows [section 4 of F4](f4-identity.md#4-structure-of-backendappsidentity): `backend/apps/<service>/`, `src/{instrumentation,main,worker,migrate,<service>.service,app.module}.ts`, `config/`, `database/`, `messaging/`, `shared/{enums,constants,types,utils}` and `modules/<module>/{index.ts,domain,application,infrastructure,presentation,__tests__/utils}`. Identical lint rules, tags (`type:app`, `scope:<service>`) and tests. `main.ts` serves the API; `worker.ts` runs the outbox relay, the consumers and the jobs.

Enums per service (all in the contract except the app ones):

| Enum                                                                                         | Where          | Example values                                            |
| -------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------- |
| `<S>ErrorCode`, `<S>Route`, `<S>Operation`, `<S>Event`, `<S>Command`, `<S>Topic`, `<S>Queue` | contract       | `TASKS.TASK.NOT_FOUND`, `tasks.task.list`, `tasks-events` |
| `<S>Resource`, `<S>Job`, `<S>CacheKey`                                                       | `shared/enums` | `TasksResource.Tasks`, `BillingJob.CloseInvoicePeriods`   |

Route ids are `service.resource.action`; operation, command and event ids carry `.vN` ([contract kit](../../backend/libs/contracts/platform/src/kit/define-operation.ts)). Errors are `SERVICE.SUBMODULE.ERROR` with their entry in the service's catalog and es and en texts.

### 3.2 Local shards and databases

`backend/infra/local/postgres/init.sql` (edited by the general) creates `<service>_shard_0` and `<service>_shard_1` for `tasks`, `notifications`, `reports` and `billing`, with `vector`, as it already does for identity: routing is exercised from day one. Reference tables go in `catalog` with the service prefix.

| Service         | Tables per tenant shard                                                                                                | Tables per user shard                                                  | Catalog                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| `tasks`         | `tasks`                                                                                                                | none                                                                   | none                                   |
| `notifications` | `email_messages`                                                                                                       | `notifications`, `notification_preferences`, `notification_deliveries` | `email_suppressions`                   |
| `reports`       | `report_runs`, `proj_tasks`, `proj_invoices`, `proj_deliveries`                                                        | none                                                                   | none                                   |
| `billing`       | `subscriptions`, `usage_records`, `usage_totals`, `invoices`, `invoice_lines`, `invoice_sequences`, `payment_attempts` | none                                                                   | `billing_plans`, `billing_plan_quotas` |

All shard tables carry `created_at`, `updated_at`, `created_by`, `updated_by` and `version`; tenant tables declare `tenant_id` and have RLS; those marked "audited" carry the `audit_log` trigger ([F4, section 5](f4-identity.md#5-modules)). Each module uses its own block of migration timestamps, declared in the service's `shared/constants/migration-ranges.constants.ts`. Entities and migrations come from the TypeORM CLI (`migration-generate`), never by hand.

### 3.3 Permissions and system roles

The `Permission` catalog lives in `@contracts/identity`. Today it carries `tasks:read`, `tasks:write`, `billing:read`, `billing:write` and `backoffice:access`; they serve `tasks` and `billing` unchanged. Two are added:

| Permission     | Value           | Routes that require it                     |
| -------------- | --------------- | ------------------------------------------ |
| `ReportsRead`  | `reports:read`  | Catalog, list and detail of runs, download |
| `ReportsWrite` | `reports:write` | Create a run                               |

`notifications` has no tenant permissions: its routes are `Access.authenticated()` and each user only touches their own data. Distribution across the system roles (identity's `shared/constants/system-roles.constants.ts`; the general adds the `reports:*` rows when integrating wave 5):

| Permission                  | Owner | Admin | Member | Billing |
| --------------------------- | ----- | ----- | ------ | ------- |
| `tasks:read`, `tasks:write` | yes   | yes   | yes    | no      |
| `reports:read`              | yes   | yes   | yes    | yes     |
| `reports:write`             | yes   | yes   | no     | no      |
| `billing:read`              | yes   | yes   | no     | yes     |
| `billing:write`             | yes   | no    | no     | yes     |

`PlanFeature` adds `AdvancedReports = 'advanced_reports'` (decision 8). `FeatureFlag.NewReports` already exists and governs access to `reports`.

### 3.4 Contract changes in `@contracts/platform` and `@contracts/identity` (troop 2, wave 5)

| Contract | Change                                                                                                                                                                                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| platform | `Access.authenticated` and `AccessRequirement` add `features` and `flags` (text, like `permissions`). Codes `PLATFORM.ACCESS.FEATURE_NOT_INCLUDED` (403) and `PLATFORM.ACCESS.FLAG_DISABLED` (404, a disabled flag behaves like a nonexistent route).                                                       |
| platform | Schemas `UserRefSchema` (`{ userId, homeTenantId }`) and `CalendarDateSchema` (`YYYY-MM-DD`). Factory `defineTenantMoveOperations(service)` with the four move operations (section 8.4) and their schemas.                                                                                                  |
| identity | Enums: `Permission.ReportsRead` and `ReportsWrite`, `PlanFeature.AdvancedReports`, `IdentitySaga` (`identity.tenant-onboarding`, `identity.delete-account`, `identity.move-tenant`).                                                                                                                        |
| identity | Routes: `POST /v1/me/deletion` (step-up, starts `DeleteAccount`) and `GET /v1/sagas/{sagaId}` (status of a saga of the user's own or tenant's). `POST /v1/tenants` now responds 202 with `{ tenantId, sagaId }` (decision 14). The `sign-in` response adds `region` and `apiBaseUrl`.                       |
| identity | Operations: `identity.tenants.activate.v1` (no compensation, it goes after the pivot), `identity.users.erase.v1` (no compensation), `identity.devices.list-push-targets.v1` and `identity.members.list-by-permission.v1` (reads), and the four move operations of `defineTenantMoveOperations('identity')`. |
| identity | Event `identity.user.erased.v1`. Queue `identity-billing`, subscribed to `billing-events` (`subscription.suspended`, `subscription.reactivated`, `entitlements.changed`). `sends` of `billing.usage.record.v1`.                                                                                             |

The new identity operations are registered as stubs (`PLATFORM.INTERNAL.UNEXPECTED`) by the general when integrating wave 5, because the identity skeleton (WP6) is written at the same time; their real handlers are written by troop 1 of wave 7.

### 3.5 New platform pieces

| Library                    | Folder                                                                | Wave, troop | Content                                                                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@platform/flags`          | `backend/libs/platform/flags`                                         | 7           | `FlagEvaluator`, `FlagStore`, `ConfigFlagStore`, `InMemoryFlagStore`, `FlagContext` (tenant, user, plan, groups). Percentage rollout with a stable hash of `flag:user`. Identity uses it to fill `UserAccess.flags`. |
| change in `@platform/auth` | `libs/platform/auth/src/access`                                       | 7           | `evaluateAccess` and `AccessRequirement` check `features` and `flags` against the `AccessGrant`.                                                                                                                     |
| change in `@platform/http` | `libs/platform/http`                                                  | 7           | `EndpointGuard` translates the two new decisions into the codes of section 3.4. No new `@Endpoint` options.                                                                                                          |
| `@platform/quotas`         | `backend/libs/platform/quotas`                                        | 8           | `QuotaChecker` (abstract), `BillingQuotaChecker` (operation `billing.quotas.check.v1`, local cache of 10 s), `QuotaGuard` and the `@Quota(UsageMetric.X)` decorator. Responds `BILLING.QUOTA.EXCEEDED`.              |
| `@platform/metering`       | `backend/libs/platform/metering`                                      | 8           | `UsageRecorder`, `BufferedUsageRecorder` (counters in Valkey, flushed by a job), `ApiCallMeteringInterceptor` and `UsageFlushJob` (section 8.3).                                                                     |
| `@platform/tenant-move`    | `backend/libs/platform/tenant-move`                                   | 9           | `TenantMoveManifest`, `TenantDataTransfer`, `TenantMoveModule` (section 8.4).                                                                                                                                        |
| `@platform/realtime`       | `backend/libs/platform/realtime`                                      | 7           | `RealtimeTransport`, `SseTransport`, `SocketIoTransport`, `StreamAuthenticator` with its two adapters, `RealtimeModule` and recovery with `Last-Event-ID` and connection state recovery over a Valkey Stream.        |
| `apps/realtime`            | `backend/apps/realtime`                                               | 7           | Minimal app that mounts `RealtimeModule` for those who prefer real time separately; consumes the `notifications` deliveries queue.                                                                                   |
| `@platform/search`         | `backend/libs/platform/search`                                        | 7           | `SearchIndex`, `PostgresTextSearch`, `PostgresHybridSearch`, `EmbeddingProvider` and its fake.                                                                                                                       |
| `bootstrapLambda`          | `libs/platform/service/src/lambda`                                    | 5, troop 3  | Lambda entry point with the same `ServiceDefinition` as `bootstrapHttp`.                                                                                                                                             |
| `SigV4Signer`              | `libs/platform/internal-api/src/signing` and `adapters/aws/src/sigv4` | 5, troop 3  | `InternalRequestSigner` with `HmacSigner` (current) and `SigV4Signer`.                                                                                                                                               |
| SES                        | `libs/platform/adapters/aws/src/ses`                                  | 7           | `SesEmailSender` on `@aws-sdk/client-sesv2`. It is the only place with `@aws-sdk/*` for email.                                                                                                                       |

## 4. `tasks` (F5)

A task of the organization: title, description and status. The owner is the organization, not whoever creates it.

### 4.1 Contract `@contracts/tasks`

```ts
export enum TaskStatus {
  Open = 'open',
  InProgress = 'in_progress',
  Done = 'done',
}
// TaskSchema: id, title, description, status, version, createdAt, updatedAt, createdBy (UserRef)
// TasksLimits: titleMax 200, descriptionMax 5000 (initial values, in constants/)
export const CreateTaskRoute = defineRoute({
  id: TasksRoute.CreateTask,
  method: HttpMethod.Post,
  path: '/v1/tasks',
  request: CreateTaskRequestSchema,
  response: TaskSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ValidationInvalidInput],
  access: Access.authenticated({ permissions: [Permission.TasksWrite] }),
  description: 'Creates a task in the active tenant.',
});
```

| Route (`TasksRoute`) | Method and path             | Access        | Screen that uses it                                                          |
| -------------------- | --------------------------- | ------------- | ---------------------------------------------------------------------------- |
| `tasks.task.list`    | `GET /v1/tasks`             | `tasks:read`  | `TasksListController`: `list` and `search` (`status`, `q`, `limit`, `after`) |
| `tasks.task.get`     | `GET /v1/tasks/{taskId}`    | `tasks:read`  | `TaskDetailController`                                                       |
| `tasks.task.create`  | `POST /v1/tasks`            | `tasks:write` | `TaskFormController` (create)                                                |
| `tasks.task.update`  | `PATCH /v1/tasks/{taskId}`  | `tasks:write` | `TaskFormController` (edit) and status change; optional `expectedVersion`    |
| `tasks.task.delete`  | `DELETE /v1/tasks/{taskId}` | `tasks:write` | Detail and list (soft delete)                                                |

| Element    | Detail                                                                                                                                                                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Errors     | `TASKS.TASK.NOT_FOUND` (404), `TASKS.TASK.VERSION_CONFLICT` (409, from `expectedVersion`), `TASKS.SEARCH.QUERY_TOO_SHORT` (400).                                                                                                                                           |
| Events     | Topic `tasks-events`: `tasks.task.created.v1`, `tasks.task.updated.v1` (changed fields, `statusBefore`, `statusAfter`, `actor`, `createdBy` as `UserRef`) and `tasks.task.deleted.v1`.                                                                                     |
| Operations | `tasks.tasks.list-changes.v1` (paginated read by `updatedAt`, for the `reports` backfill); `tasks.user-data.erase.v1` (no compensation: it comes after the `DeleteAccount` pivot; anonymizes `created_by` and `updated_by`, the tasks are kept); the four move operations. |
| Queues     | None. `tasks` only publishes.                                                                                                                                                                                                                                              |

### 4.2 Modules

| Module    | Responsibility                                                              | Tables (tenant shard)                                                                                                     |
| --------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `tasks`   | `Task` aggregate, use cases for the five routes, text search (`TaskSearch`) | `tasks` (audited): title, description, `status`, `created_by`, `created_by_home_tenant_id`, `deleted_at`, `search_vector` |
| `privacy` | `erase` and `list-changes` operations; the move manifest                    | None of its own                                                                                                           |

`search_vector` is a generated `tsvector` column with the `spanish` configuration and a GIN index; `PostgresTaskSearch` queries it with `websearch_to_tsquery`. The default index is `(tenant_id, status, id)`, so the list paginates by UUIDv7 cursor.

```ts
export abstract class TasksFacade {
  abstract get(tenantId: string, taskId: string): Promise<TaskSnapshot>;
  abstract anonymizeUser(userId: string): Promise<number>;
  abstract listChanges(query: ChangesQuery): Promise<Page<TaskSnapshot>>;
}
export abstract class TaskSearch {
  abstract search(query: TaskSearchQuery): Promise<Page<TaskSnapshot>>;
}
```

`FakeTasksFacade` and `InMemoryTaskSearch` live in `modules/tasks/__tests__/utils/`.

### 4.3 Jobs, configuration and capabilities

| Element                 | Detail                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TasksJob.PurgeDeleted` | Daily, exclusive `ScheduledJob`: deletes tasks with `deleted_at` older than `TASKS_DELETED_RETENTION_DAYS`.                                         |
| Flags                   | `tasks` uses no flags; it exercises the capabilities with `GET /v1/tasks` and search. Flags are exercised by `reports` (`NewReports`) and identity. |
| Configuration           | `baseConfigSchema`, `databaseConfigSchema`, `valkeyConfigSchema` and `TASKS_DELETED_RETENTION_DAYS`.                                                |

## 5. `notifications` (F6)

A single entry point, `notify(userRef, type, data)`: the type sets the criticality and the user's preferences set the channels. Security alerts always go out through every channel. The real-time gateway is a module of this service ([ADR 0011](../adr/0011-real-time-socketio-sse.md), with the adjustments of decision 4).

### 5.1 Contract `@contracts/notifications`

```ts
export enum NotificationType {
  SecurityAlert = 'security_alert',
  TaskUpdated = 'task_updated',
  InvoiceIssued = 'invoice_issued',
  AccountActivity = 'account_activity',
}
export enum NotificationChannel {
  InApp = 'in_app',
  Push = 'push',
  Email = 'email',
}
// MandatoryNotificationTypes (constants/): [SecurityAlert], ignores preferences and quiet hours
```

| Route (`NotificationsRoute`)        | Method and path                                | Access        | Screen that uses it                                |
| ----------------------------------- | ---------------------------------------------- | ------------- | -------------------------------------------------- |
| `notifications.inbox.list`          | `GET /v1/notifications`                        | authenticated | `InboxController.fetchInbox` (pages, newest first) |
| `notifications.inbox.unread-count`  | `GET /v1/notifications/unread-count`           | authenticated | `watchUnreadCount` and the menu badge              |
| `notifications.inbox.mark-read`     | `POST /v1/notifications/{notificationId}/read` | authenticated | `markAsRead` (idempotent)                          |
| `notifications.inbox.mark-all-read` | `POST /v1/notifications/read-all`              | authenticated | `markAllAsRead`                                    |
| `notifications.preferences.get`     | `GET /v1/notification-preferences`             | authenticated | `PreferencesController.fetchPreferences`           |
| `notifications.preferences.save`    | `PUT /v1/notification-preferences`             | authenticated | `savePreferences`                                  |

`NotificationPreferences` carries `enabled` (type to channels), `quietStart`, `quietEnd` (`HH:mm`) and `timezone` (IANA, decision 6). The `title` and `body` texts are generated by the server in the user's language.

With Socket.IO, the same flow goes through the `/notifications` namespace with the same frame types; the front ships the SSE adapter behind its `NotificationsStream` port. The SSE stream `GET /v1/notifications/stream` stays out of the contract (it is not request and response JSON), like `/health`. It sends three frame types: `notification` (the new `AppNotification`), `unread-count` and `session-closed`. It authenticates with `Authorization: Bearer <access token>` and resumes with `Last-Event-ID`.

| Element    | Detail                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Errors     | `NOTIFICATIONS.INBOX.NOT_FOUND` (404), `NOTIFICATIONS.PREFERENCES.INVALID_QUIET_HOURS` (400), `NOTIFICATIONS.EMAIL.RECIPIENT_SUPPRESSED` (internal), `NOTIFICATIONS.EMAIL.TEMPLATE_UNKNOWN` (internal), `NOTIFICATIONS.REALTIME.UNAUTHENTICATED` (401).                                                                                                              |
| Events     | Topic `notifications-events`: `notifications.notification.created.v1` (no text: tenant, type, channels used; consumed by `reports`).                                                                                                                                                                                                                                 |
| Operations | `notifications.messages.send.v1` (transactional email with a one-time code: it travels through the internal API and never through the bus; no compensation: a sent email cannot be withdrawn), `notifications.users.notify.v1` (same reason), `notifications.user-data.erase.v1` (no compensation, after the pivot) and the four move operations.                    |
| Queues     | `notifications-triggers` (subscribed to `identity-events`: `security-alert.raised` and `membership.changed`; to `tasks-events`: `task.updated`; to `billing-events`: `invoice.issued`; to `reports-events`: `run.completed`) and `notifications-realtime-control` (subscribed to `identity-events`: `session.revoked` and `tokens.revoked`, closes SSE connections). |

### 5.2 Modules

| Module        | Responsibility                                                                                                                                                                                                                                              | Shard              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `inbox`       | `Notification` aggregate (`readAt`), list, count, mark as read; job `NotificationsJob.PurgeRead`                                                                                                                                                            | User               |
| `preferences` | `NotificationPreferences` per user and `DeliveryPolicy`: channels by type, preferences, quiet hours and presence                                                                                                                                            | User               |
| `dispatch`    | `NotifyUser`, recipient and language via `identity.users.get-profile.v1`, templates per type, delivery retry (`NotificationsJob.RetryDeliveries`, exclusive, up to 5 attempts)                                                                              | User               |
| `email`       | `EmailSender` (`SesEmailSender`, `SmtpEmailSender` for Mailpit, `InMemoryEmailSender`), versioned templates and suppression list                                                                                                                            | Tenant and catalog |
| `push`        | `PushSender` per platform (`ApnsPushSender`, `FcmPushSender`, `WebPushSender`: for now only `InMemoryPushSender` and `NonePushSender`, which delivers nothing and records the push as skipped) and targets via `identity.devices.list-push-targets.v1`      | None               |
| `realtime`    | Mounts `RealtimeModule` from `@platform/realtime` with the transports of `REALTIME_TRANSPORTS`; `RealtimeFacade` publishes to the per-user Valkey Stream (`notifications:rt:*`). With `REALTIME_HOST=app` it mounts nothing and `apps/realtime` handles it. |
| `triggers`    | Consumers that translate events into `NotifyUser`, with the table below                                                                                                                                                                                     | None               |

| Source event                                                 | Recipient                                                               | Type              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------- |
| `identity.security-alert.raised.v1`                          | The user of the alert, all channels                                     | `SecurityAlert`   |
| `tasks.task.updated.v1`                                      | `createdBy`, if the actor is someone else                               | `TaskUpdated`     |
| `billing.invoice.issued.v1`                                  | Members with `billing:write` (`identity.members.list-by-permission.v1`) | `InvoiceIssued`   |
| `identity.membership.changed.v1`, `reports.run.completed.v1` | The affected user, or whoever requested the report                      | `AccountActivity` |

```ts
export abstract class DispatchFacade {
  abstract notify(
    ref: UserRef,
    type: NotificationType,
    data: NotificationData,
  ): Promise<NotificationId>;
}
export abstract class InboxFacade {
  abstract add(
    ref: UserRef,
    draft: NotificationDraft,
  ): Promise<AppNotification>;
}
export abstract class PreferencesFacade {
  abstract get(ref: UserRef): Promise<NotificationPreferences>;
}
export abstract class EmailFacade {
  abstract send(message: EmailMessage): Promise<EmailDelivery>;
}
export abstract class RealtimeFacade {
  abstract deliver(ref: UserRef, frame: RealtimeFrame): Promise<void>;
  abstract isOnline(ref: UserRef): Promise<boolean>;
}
```

Each facade has its fake in `modules/<m>/__tests__/utils/`. Templates are `EmailTemplate` classes with `render(vars, locale)`, their own `escapeHtml` and one version per template; there is one per value of F4's `IdentityEmailTemplate`, plus welcome, task updated, invoice issued and report ready. The identity adapter `NotificationsIdentityMailer` (section 11, wave 7) replaces the F4 fake.

Tables: `notifications` (user: `id`, `type`, `title`, `body`, `locale`, `read_at`), `notification_preferences` (one row per user), `notification_deliveries` (notification, channel, status, error, provider id), `email_messages` (tenant: template, version, HMAC fingerprint of the recipient, status, `trace_id`; it does not store the body) and `email_suppressions` (catalog: email fingerprint, reason). Valkey: `notifications:presence:{userId}` and `notifications:rt:{userId}`, always under the service prefix (ADR 0021).

Configuration: `NOTIFICATIONS_EMAIL_SENDER` (`memory`, `smtp` or `ses`; `dev`, `staging` and `prod` accept only `ses`), `SMTP_URL`, `NOTIFICATIONS_FROM_ADDRESS`, `NOTIFICATIONS_PUSH_SENDER` (`memory` or `none`; `dev` accepts both, `staging` and `prod` only `none`), `NOTIFICATIONS_INBOX_RETENTION_DAYS`. The allowed values follow `DEPLOY_ENVIRONMENT` ([ADR 0046](../adr/0046-providers-and-telemetry-per-environment.md)); `local` accepts any.

## 6. `reports` (F7)

Reports on the tenant's data, computed in the background and stored as a result.

### 6.1 Contract `@contracts/reports`

```ts
export enum ReportType {
  TasksByStatus = 'tasks_by_status',
  TasksActivity = 'tasks_activity',
  InvoicesSummary = 'invoices_summary',
  NotificationsDelivery = 'notifications_delivery',
}
export enum ReportRunStatus {
  Queued = 'queued',
  Running = 'running',
  Ready = 'ready',
  Failed = 'failed',
  Expired = 'expired',
}
export enum ReportFormat {
  Json = 'json',
  Csv = 'csv',
}
```

| Route (`ReportsRoute`) | Method and path                         | Access                                                                           | Screen (`reports` microfrontend)               |
| ---------------------- | --------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------- |
| `reports.catalog.list` | `GET /v1/reports`                       | `reports:read`, flag `NewReports`                                                | Catalog and parameters form                    |
| `reports.run.create`   | `POST /v1/reports/runs`                 | `reports:write`, flag `NewReports` (CSV requires the `advanced_reports` feature) | "Generar" button (202 with `runId`)            |
| `reports.run.list`     | `GET /v1/reports/runs`                  | `reports:read`, flag `NewReports`                                                | Runs list                                      |
| `reports.run.get`      | `GET /v1/reports/runs/{runId}`          | `reports:read`, flag `NewReports`                                                | Detail and result (`columns`, `rows`)          |
| `reports.run.download` | `GET /v1/reports/runs/{runId}/download` | `reports:read`, flag `NewReports`                                                | Download: `{ fileName, contentType, content }` |

The parameter of a run is `{ from, to, granularity }` with `CalendarDateSchema`. The `advanced_reports` requirement for CSV is applied by the use case with `PLATFORM.ACCESS.FEATURE_NOT_INCLUDED`, because it depends on the body and not on the route.

| Element    | Detail                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Errors     | `REPORTS.RUN.NOT_FOUND` (404), `REPORTS.RUN.NOT_READY` (409), `REPORTS.RUN.EXPIRED` (410), `REPORTS.TYPE.UNKNOWN` (400), `REPORTS.PARAMS.INVALID_RANGE` (400), `REPORTS.RESULT.TOO_LARGE` (422).                                                                                                                                            |
| Events     | Topic `reports-events`: `reports.run.completed.v1` (tenant, type, status, `requestedBy` as `UserRef`).                                                                                                                                                                                                                                      |
| Commands   | `reports.run.execute.v1` on the `reports-runs` queue: the use case sends it to itself through the outbox, so the run leaves the request and a worker picks it up.                                                                                                                                                                           |
| Operations | `reports.user-data.erase.v1` (no compensation, after the pivot: removes `requestedBy` from the runs and the projections that have a user) and the four move operations.                                                                                                                                                                     |
| Queues     | `reports-runs`; `reports-projections` (subscribed to `tasks-events`: all three) and `reports-finance-projections` (subscribed to `billing-events`: `invoice.issued`, `invoice.paid`, `invoice.failed`, and to `notifications-events`: `notification.created`). The latter enters the contract in wave 5 and its consumer arrives in wave 7. |

### 6.2 Modules

| Module        | Responsibility                                                                                                                             | Tables (tenant shard)                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `catalog`     | `ReportDefinition` (one class per type: parameters, columns, `compute`), `ReportRegistry`                                                  | None                                                                            |
| `runs`        | `ReportRun` aggregate, use cases for the routes, command execution, `ReportsJob.ExpireRuns` (daily, exclusive, deletes expired results)    | `report_runs` (audited): status, parameters, `result jsonb`, size, `expires_at` |
| `projections` | Consumers that maintain the projections and `ReportsJob.BackfillProjections` (backfill via `tasks.tasks.list-changes.v1`, once per tenant) | `proj_tasks`, `proj_invoices`, `proj_deliveries`                                |

```ts
export abstract class ReportDefinitionRegistry {
  abstract get(type: ReportType): ReportDefinition;
}
export abstract class ProjectionsFacade {
  abstract taskStatusCounts(
    tenantId: string,
    range: DateRange,
  ): Promise<StatusCount[]>;
  abstract taskActivity(
    tenantId: string,
    range: DateRange,
    granularity: Granularity,
  ): Promise<ActivityPoint[]>;
}
```

`ReportDefinition.compute` only reads projections through `ProjectionsFacade`, never another service or another database. The maximum result size is `REPORTS_MAX_RESULT_BYTES`; the result lives in the row and expires after `REPORTS_RESULT_TTL_DAYS` (decision 7).

## 7. `billing` (F8)

Computes what each tenant must pay and tracks the status of each invoice. Charging is a separate process behind the `PaymentProvider` port.

### 7.1 Contract `@contracts/billing`

It imports `PlanFeature` from `@contracts/identity`; the general adds the `contracts-billing` to `contracts-identity` boundary rule in `backend/eslint.config.mjs`.

```ts
export enum SubscriptionStatus {
  Trialing = 'trialing',
  Active = 'active',
  PastDue = 'past_due',
  Suspended = 'suspended',
  Canceled = 'canceled',
}
export enum InvoiceStatus {
  Draft = 'draft',
  Issued = 'issued',
  Paid = 'paid',
  Failed = 'failed',
  Void = 'void',
}
export enum InvoiceLineKind {
  FixedFee = 'fixed_fee',
  Usage = 'usage',
}
export enum PlanPeriodicity {
  Monthly = 'monthly',
  Annual = 'annual',
}
export enum Currency {
  Cop = 'COP',
  Usd = 'USD',
}
export enum UsageMetric {
  Users = 'users',
  ApiCalls = 'api_calls',
  StorageGb = 'storage_gb',
}
// UsageAggregation (constants/): Users and StorageGb = maximum of the period; ApiCalls = sum
```

The schemas mirror the front types: `Plan` (`id`, `name`, `price: MoneyAmount`, `periodicity`, `quotas: { metric, limit }[]`, `features`), `Subscription` (`id`, `plan`, `status`, `period: { start, end }` with `CalendarDateSchema`), `QuotaUsage` (`metric`, `limit`, `used`), `Invoice` (`id`, `number`, `period`, `status`, `currency`, `lines`, `total`) with `InvoiceLine` (`kind`, `description`, `amount`).

| Route (`BillingRoute`)             | Method and path                        | Access          | Screen that uses it                                 |
| ---------------------------------- | -------------------------------------- | --------------- | --------------------------------------------------- |
| `billing.subscription.get`         | `GET /v1/billing/subscription`         | `billing:read`  | `BillingPlanController` (`currentSubscription`)     |
| `billing.usage.get`                | `GET /v1/billing/usage`                | `billing:read`  | `BillingPlanController` (`currentUsage`) and meters |
| `billing.plan.list`                | `GET /v1/billing/plans`                | `billing:read`  | `ChangePlanController` (`availablePlans`)           |
| `billing.subscription.change-plan` | `PUT /v1/billing/subscription/plan`    | `billing:write` | `ChangePlanController.changePlan`                   |
| `billing.invoice.list`             | `GET /v1/billing/invoices`             | `billing:read`  | `InvoicesController` (pages, newest first)          |
| `billing.invoice.get`              | `GET /v1/billing/invoices/{invoiceId}` | `billing:read`  | `InvoiceDetailController`                           |

| Element    | Detail                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Errors     | `BILLING.SUBSCRIPTION.NOT_FOUND` (404), `BILLING.SUBSCRIPTION.NOT_CHANGEABLE` (409, suspended or canceled), `BILLING.PLAN.NOT_AVAILABLE` (404), `BILLING.PLAN.USAGE_EXCEEDS_LIMIT` (409, downgrading with usage above the new limit), `BILLING.INVOICE.NOT_FOUND` (404), `BILLING.INVOICE.INVALID_STATE` (409), `BILLING.QUOTA.EXCEEDED` (403, with `metric`, `limit` and `used` in `details`).                                                             |
| Events     | Topic `billing-events`: `billing.subscription.changed.v1`, `billing.subscription.suspended.v1`, `billing.subscription.reactivated.v1`, `billing.entitlements.changed.v1`, `billing.invoice.issued.v1`, `billing.invoice.paid.v1`, `billing.invoice.failed.v1`.                                                                                                                                                                                              |
| Commands   | `billing.usage.record.v1` on the FIFO queue `billing-usage`: batch `{ tenantId, records: [{ metric, quantity, windowStart, key }] }`. Each service that meters declares it in `sends`.                                                                                                                                                                                                                                                                      |
| Operations | `billing.accounts.open.v1` (compensated by `billing.accounts.close.v1`, which, with no issued invoice, deletes the subscription and has no compensation of its own: it only runs as a compensation), `billing.entitlements.get.v1` and `billing.quotas.check.v1` (reads), `billing.invoices.mark-paid.v1` and `billing.invoices.mark-failed.v1` (no compensation: the payment happened outside; it is corrected with a note), and the four move operations. |
| Queues     | `billing-usage` (the command) and `billing-identity` (subscribed to `identity-events`: `membership.changed`, for the user count).                                                                                                                                                                                                                                                                                                                           |

### 7.2 Modules

| Module          | Responsibility                                                                                                                                                                               | Shard                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `plans`         | Versioned catalog (`billing_plans`, `billing_plan_quotas`), seeded with `nx run billing:seed`                                                                                                | Catalog                  |
| `subscriptions` | `Subscription` aggregate, plan change with proration (`ProrationCalculator`, integers, rounding up), dunning cycle and trial. Jobs `BillingJob.AdvanceDunning` and `BillingJob.ExpireTrials` | Tenant (`subscriptions`) |
| `usage`         | Idempotent ingestion of the command (`usage_records`, unique per tenant and `key`), aggregates per period (`usage_totals`) and user count via `membership.changed`                           | Tenant                   |
| `entitlements`  | `EntitlementsSnapshot` (features and quotas of the current plan), `get` and `check` operations, `entitlements.changed` event                                                                 | None of its own          |
| `invoices`      | `Invoice` and lines, consecutive numbering per tenant (`invoice_sequences`), `BillingJob.CloseInvoicePeriods` (daily, exclusive)                                                             | Tenant                   |
| `payments`      | `PaymentProvider` port (`FakePaymentProvider`, `NonePaymentProvider`, which never charges and leaves each invoice issued), `payment_attempts`, `mark-paid` and `mark-failed` operations      | Tenant                   |

```ts
export abstract class SubscriptionsFacade {
  abstract current(tenantId: string): Promise<SubscriptionSnapshot>;
  abstract changePlan(
    tenantId: string,
    planId: string,
  ): Promise<SubscriptionSnapshot>;
}
export abstract class EntitlementsFacade {
  abstract snapshot(tenantId: string): Promise<EntitlementsSnapshot>;
  abstract check(
    tenantId: string,
    metric: UsageMetric,
    delta?: number,
  ): Promise<QuotaCheck>;
}
export abstract class UsageFacade {
  abstract totals(tenantId: string, periodStart: string): Promise<QuotaUsage[]>;
}
export abstract class PaymentProvider {
  abstract charge(invoice: InvoiceSnapshot): Promise<PaymentOutcome>;
}
```

- **Delinquency.** `invoice.failed` moves the subscription to `PastDue`; after `BILLING_GRACE_DAYS` the job moves it to `Suspended` and publishes `billing.subscription.suspended.v1`; identity consumes it in `identity-billing` and calls `identity.tenants.suspend.v1`. A later payment reactivates it with `subscription.reactivated.v1`.
- **Entitlements.** Any plan or status change publishes `billing.entitlements.changed.v1`; identity bumps the tenant's permissions version (`auth:pv:tenant`) and the next token carries the new `features`.
- **Invoices.** `CloseInvoicePeriods` closes the expired periods: it builds the fixed fee and usage lines (only metrics with a unit price in the plan, decision 11), issues the invoice, publishes `invoice.issued` and asks `PaymentProvider` for the charge. Everything in integers of the minimum unit with its currency.
- **Quotas.** `Users` is checked in identity when adding a member (`BillingQuotaChecker`); `ApiCalls` with `@Quota(UsageMetric.ApiCalls)` on the integration routes. The value of `check` can lag by up to 10 s.

Configuration: `BILLING_TRIAL_DAYS`, `BILLING_GRACE_DAYS`, `BILLING_INVOICE_SERIES`, `BILLING_PAYMENT_PROVIDER` (`fake` or `none`; `dev` accepts both, `staging` and `prod` only `none`, per [ADR 0046](../adr/0046-providers-and-telemetry-per-environment.md)). Invoice numbers are internal; electronic invoicing with the DIAN is out of scope.

## 8. What crosses services (wave 7)

### 8.1 Example sagas

They are orchestrated by identity with `SagaModule.forFeature` ([persistence and sagas, section 5](typeorm-persistence-and-sagas.md#5-sagas)); each step is an operation of a contract, and its reverse comes from `compensatedBy`.

**`TenantOnboarding`** (`modules/tenants`). `POST /v1/tenants` creates the tenant in `Provisioning` and starts the saga in the same transaction. It replaces F4's direct `CreateTenant`.

| Step  | Operation                                 | Compensation                  | Phase            |
| ----- | ----------------------------------------- | ----------------------------- | ---------------- |
| 1     | `identity.tenants.create.v1`              | `identity.tenants.discard.v1` | Before the pivot |
| 2     | `billing.accounts.open.v1`                | `billing.accounts.close.v1`   | Before the pivot |
| pivot |                                           |                               |                  |
| 3     | `identity.tenants.activate.v1`            | None (idempotent)             | After            |
| 4     | `notifications.users.notify.v1` (welcome) | None (idempotent)             | After            |

While it runs, the tenant is in `Provisioning` and nobody uses it. If `billing` rejects step 2, the tenant is discarded and the creator gets `GET /v1/sagas/{sagaId}` in `compensated`.

**`DeleteAccount`** (`modules/users`, `POST /v1/me/deletion` with step-up). Habeas data: the only reversible step goes first.

| Step  | Operation                                                                                                                    | Compensation                   | Phase            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------- |
| 1     | `identity.users.suspend.v1`                                                                                                  | `identity.users.reactivate.v1` | Before the pivot |
| pivot |                                                                                                                              |                                |                  |
| 2     | `tasks.user-data.erase.v1`                                                                                                   | None (idempotent)              | After            |
| 3     | `notifications.user-data.erase.v1`                                                                                           | None (idempotent)              | After            |
| 4     | `reports.user-data.erase.v1`                                                                                                 | None (idempotent)              | After            |
| 5     | `identity.users.erase.v1` (status `Deleted`, deletes credentials, sessions, devices, passkeys and the `identity_lookup` row) | None                           | After            |

A `BusinessError` after the pivot leaves the saga in `RequiresIntervention` (backoffice). The saga publishes `identity.user.erased.v1` when it finishes. `billing` deletes nothing of the user: invoices belong to the tenant and are kept.

**`MoveTenant`** is described in section 8.4.

### 8.2 How `reports` aggregates data

1. The `reports-projections` consumers write one row per task in `proj_tasks` (status, creation, closing, deletion) with the event id itself as the idempotency key. The `reports-finance-projections` consumers write `proj_invoices` and `proj_deliveries`.
2. A tenant that existed before the service has no history. `BackfillProjections` paginates `tasks.tasks.list-changes.v1` per tenant and marks the tenant as backfilled; new events and the backfill merge without duplicates because the key is the `taskId` and `version`.
3. `compute` aggregates with SQL over the projections of the tenant's own shard. There is no cross-shard query in a tenant report. `AcrossShards` is reserved for the service's own maintenance jobs.
4. Wave 6 delivers `TasksByStatus` and `TasksActivity` with task projections. Wave 7 adds `InvoicesSummary` and `NotificationsDelivery`, and the invoice backfill.

### 8.3 Metering towards `billing`

| Metric      | Source                                                                                                                                                                 | Idempotency key                         |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `ApiCalls`  | `ApiCallMeteringInterceptor` counts the requests of `ServiceAccountActor` actors in a Valkey counter per tenant and minute; `UsageFlushJob` sends the batch every 60 s | `<service>:<tenant>:api_calls:<window>` |
| `Users`     | `billing` consumes `identity.membership.changed.v1` and keeps the count of active members                                                                              | `membership.changed` (message id)       |
| `StorageGb` | No source: there is no files service (decision 12)                                                                                                                     | Not applicable                          |

`UsageFlushJob` runs per tenant inside `ShardScope.run` and `runInTransaction`, because the outbox requires a transaction. A restart loses at most the in-memory window of the process, not the Valkey counters. Each service adds `MeteringModule` to its `app.module.ts` (one line that the general integrates) and declares `sends` in its contract from wave 5.

### 8.4 Multiple regions and `MoveTenant` (F10)

**Regions.** A `REGIONS` variable (JSON: `code`, `apiBaseUrl`, `issuer`) and `SERVICE_REGION` identify the region of each deployment. The catalog lives in the main region. Each service rejects a tenant from another region with `PLATFORM.SHARDING.WRONG_REGION` (421) and `details.apiBaseUrl`; the front SDK (`packages/api`) retries once against that URL. `sign-in` returns `region` and `apiBaseUrl`, and tokens from one region do not verify in the other because the `iss` changes. Each region has its own Valkey, queues and shards.

**Local.** A second Postgres (`postgres-b`) and a second Valkey (`valkey-b`) in the compose file simulate region B; each service runs twice with `SERVICE_REGION`. The general edits the compose file and `init.sql`.

**Moving data.** `@platform/tenant-move` defines what each service declares and the generic copy:

```ts
export interface TenantMoveTable {
  readonly table: string;
  /** How the tenant's rows are reached: its own column or through a parent table. */
  readonly selector:
    | { readonly kind: 'tenant-column'; readonly column: string }
    | {
        readonly kind: 'via-parent';
        readonly parent: string;
        readonly column: string;
        readonly parentColumn: string;
      };
}
export abstract class TenantMoveManifest {
  abstract tables(): readonly TenantMoveTable[]; // in dependency order
}
export abstract class TenantDataTransfer {
  abstract sync(move: MoveRef): Promise<TransferProgress>;
  abstract verify(move: MoveRef): Promise<TransferVerification>;
  abstract abort(move: MoveRef): Promise<void>;
  abstract cleanup(move: MoveRef): Promise<void>;
}
```

`BatchTenantDataTransfer` copies in batches with a cursor by `id` (UUIDv7, ordered by creation) and repeats delta rounds with `updated_at` until the lag drops below a threshold; soft delete makes deletions visible. It verifies counts and the `md5` sum per table. The source service connects to the target shards with `TENANT_MOVE_TARGETS` (write-only credentials on those databases). The operations `<service>.tenant-move.{sync,finalize,abort,cleanup}.v1` from `defineTenantMoveOperations` are registered by `TenantMoveModule.forFeature({ service, manifest })`.

**Write gate.** With the tenant in `Migrating`, the persistence resolver waits up to `TENANT_MOVE_MAX_WAIT_MS` for it to return to `Active` and, if it does not, responds `PLATFORM.SHARDING.TENANT_MIGRATING` (503 with `Retry-After`). It replaces the architecture's Valkey lock, which does not cross each service's prefix.

| Step | What it does                                                                                          | Compensation                  | Phase  |
| ---- | ----------------------------------------------------------------------------------------------------- | ----------------------------- | ------ |
| 1    | `BeginMove`: validates the target, records `tenant_moves` in the catalog                              | `AbortMove`                   | Before |
| 2-6  | `<service>.tenant-move.sync` in identity, tasks, notifications, reports and billing (writes continue) | `<service>.tenant-move.abort` | Before |
| 7    | `FreezeTenant`: placement in `Migrating`                                                              | `UnfreezeTenant` (`Active`)   | Before |
| 8-12 | `<service>.tenant-move.finalize` (last round, verification, `identity_lookup.region` in identity)     | `<service>.tenant-move.abort` | Before |
| 13   | `SwitchDirectory`: new group and region, `Active`, version + 1, `ShardDirectoryChanged` event         | Pivot                         | Pivot  |
| 14   | `FinishMove`: marks `tenant_moves` as `Switched`                                                      | None (idempotent)             | After  |

`TenantMoveCleanupJob` (identity, daily, exclusive) calls `cleanup` on each service once `TENANT_MOVE_GRACE_DAYS` have passed since the cutover. A `SharedCustomers` or `Platform` tenant is not moved (`IDENTITY.TENANT_MOVE.NOT_MOVABLE`). It is launched with `nx run identity:tenant-move -- --tenant=<id> --target=<region>`, audited with the commit, not over HTTP. The tenant moves the users whose `homeTenantId` is that tenant (the `users` table declares `home_tenant_id` in its manifest and the other user tables are linked with `via-parent`).

### 8.5 Generators (F11)

They start from what is already built: `tasks` is the reference for a complete minimal service and `plans` or `inbox` for a module.

| Generator                                              | Creates                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nx run generators:service -- --name=<n>`              | `backend/apps/<n>/` with the skeleton of section 3.1 (`project.json` with tags, `tsconfig*`, `jest.config.cjs`, `eslint.config.mjs`, `src/*.ts`, `config`, `database`, `messaging`, `shared`), `backend/libs/contracts/<n>/` with its folders, the tfvars of `environments/*/services/<n>/` and a `health` module. It prints the lines for shared files (`tsconfig.base.json` aliases, `init.sql`, `.env.example`, boundary rule). |
| `nx run generators:module -- --service=<n> --name=<m>` | `modules/<m>/{index.ts,domain,application/<m>.facade.ts,infrastructure/persistence/{entities,mappers,migrations},presentation/<m>.module.ts,__tests__/utils/fake-<m>.facade.ts}`, a migrations block in `migration-ranges.constants.ts` and the line in `app.module.ts` and in `database/*-migrations.ts` (`// generated:modules` markers).                                                                                        |

The generators are classes with text templates and substitution of `__name__`, `__Name__` and `__NAME__`, without a library (decision 18). `generators:verify` regenerates the `tasks` skeleton with its name and compares byte by byte the files that are not domain files (the bootstrap, configuration and `project.json` files): a template that drifts from the real service breaks CI. `contracts-export` adds an `openapi` target that writes `export/openapi.json` (OpenAPI 3.1) from `contract.json`, without `@nestjs/swagger` (decision 4 of F4). The wave 9 cycle also updates ARCHITECTURE, the ADRs and the `backend-structure` skill, and removes the phrase "arrive in phase F11" from `CLAUDE.md`.

## 9. Screens (F9)

Each microfrontend replaces `RepositoryBinding.demoOnly` with a binding with `demo` and `live`, and adds an `Api<Name>Repository` on `ApiClient` and the generated routes (`TasksRoutes`, `NotificationsRoutes`, `BillingRoutes`, `ReportsRoutes`), which validates the request against the contract before calling. The fakes are kept for demo mode and tests. Tests use `test_utils` with a fake transport; they do not need a backend.

| Microfrontend                                    | Real repository                                                                                                                                                                       | Particulars                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tasks`                                          | `ApiTasksRepository`: `list` and `search` come from `GET /v1/tasks`; `TaskNotFoundException` comes from `TASKS.TASK.NOT_FOUND`; `changes()` is emitted after each own write           | Search becomes paginated with `after`                                                                                                                     |
| `notifications`                                  | `ApiNotificationsRepository` and `SseNotificationsStream` (reads `GET /v1/notifications/stream` with `package:http` and the token from `packages/auth`, resumes with `Last-Event-ID`) | `live()` and `watchUnreadCount()` come from the stream; without a connection they fall back to polling the count. Adds `timezone` when saving preferences |
| `billing`                                        | `ApiBillingRepository`; `BILLING.QUOTA.EXCEEDED` and `BILLING.PLAN.USAGE_EXCEEDS_LIMIT` are shown in `ChangePlanController`                                                           | The `Currency` and `QuotaKey` enums and the statuses are replaced by the generated ones; `invoice(id)` returns null on `BILLING.INVOICE.NOT_FOUND`        |
| `reports` (new)                                  | Generated with `dart run front/tools/new_microfrontend.dart reports --menu "Reportes"`; `ApiReportsRepository`                                                                        | Screens: catalog with parameters, runs list (with polling while `Queued` or `Running`) and detail with download. Access `reports:read`                    |
| `backoffice`, `assistant`, `verifier`, `account` | No changes in these phases                                                                                                                                                            | `verifier` and `account` depend on F4; `backoffice` and `assistant` wait for the `backoffice-api` and the AI module                                       |

Each new error code with a public audience has its es and en text in `front/packages/i18n` (delivered by troop 2 of wave 5). The label keys of each microfrontend stay in its own ARB.

## 10. Deployment per service (F12, only what concerns these services)

A service is deployable when it meets the contract with the pipeline written by troop 3 of wave 5, without reading its code. Each service ships `main.ts` and `lambda.ts`, and the table shows the template's default runtime; changing it is one tfvars line:

1. `backend/apps/<service>/project.json` with tag `type:app` and the targets `build` (`app-bundler`, output in `backend/dist/<service>`), `migrate` and `seed`.
2. `backend/infra/terraform/environments/<environment>/services/<service>/{terraform.tfvars,backend.tfvars}`. The pipeline walks that folder: there is no list of services written in the workflow.
3. Order per service: `migrate`, `apply` of the `service` stack and image publishing.

| Service         | `api.runtime` | `route_prefixes`                                    | Extra parts                                                                                                             |
| --------------- | ------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `tasks`         | `fargate`     | `/v1/tasks`                                         | Worker for the outbox and the jobs                                                                                      |
| `notifications` | `fargate`     | `/v1/notifications`, `/v1/notification-preferences` | `realtime` (public ALB, route `/v1/notifications/stream`), `triggers` and `realtime-control` workers, `ses_send = true` |
| `reports`       | `fargate`     | `/v1/reports`                                       | `runs` and `projections` workers                                                                                        |
| `billing`       | `fargate`     | `/v1/billing`                                       | `usage` and `identity` workers                                                                                          |

Troops 4 and 5 write the `dev`, `staging` and `prod` tfvars of their services; the unique `listener_rule_priority` of each Fargate API and the `<service>_shard_<n>` databases of `environments/*/data/terraform.tfvars` are assigned by the general. `topology.json` is regenerated by `contracts-export` in wave 5 (queues, topics and `producers`). Each service's role does not request `files_access`.

## 11. Work packages

In wave 5 each troop is one Sonnet guide and two Haiku (the `@platform/http` and identity troop adds an Opus captain); from wave 6 on, each wave is a cycle with an Opus builder and an Opus reviewer (11.2). Paths are relative to the repository root. What the general integrates in each wave: `nx.json`, `backend/tsconfig.base.json` (aliases), `backend/eslint.config.mjs`, `backend/docker-compose.yml`, `backend/infra/local/**`, `backend/.env.example`, `front/pubspec.yaml`, `front/apps/*/lib/main.dart`, `environments/*/data/terraform.tfvars`, the `app.module.ts` files that several troops touch in wave 7 and `docs/plan/**`. Each troop lists in its report the lines it asks the general for.

### 11.1 Wave 5

| Troop             | Exclusive folders                                                                                                                                                                                                                                                                                                                                                                             | Produces                                                                                                                                                                                                                                      | Closes                                                                                                                                                                                                                                        | Depends on        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 2 (contracts)     | `backend/libs/contracts/{tasks,notifications,reports,billing}/**`; `backend/libs/contracts/identity/src/**` and `export/**` (only the delta of 3.4); `backend/libs/contracts/platform/src/{kit,schemas,types,enums,errors}/**`; `backend/libs/contracts/asyncapi.json`; `backend/infra/terraform/topology.json`; `front/packages/contracts/lib/src/**`; ARB files of `front/packages/i18n/**` | Sections 3.3, 3.4, 4.1, 5.1, 6.1 and 7.1 complete with their Dart, `topology.json`, `asyncapi.json` and the es and en texts of each public code. Haiku 1: tasks and notifications. Haiku 2: reports and billing. Guide: platform and identity | `contract.spec.ts` of each service (unique ids, existing compensations, codes with catalog, JSON-safe schemas); `pnpm nx run contracts-export:check`; `dart run contracts_gen --check`; ARB test                                              | Wave 4 integrated |
| 3 (pipeline, F12) | `.github/workflows/{deploy,publish-web,publish-mobile}.yml`; `backend/infra/scripts/**`; `backend/infra/terraform/modules/oidc*/**`; the OIDC module inside `stacks/platform`; `backend/libs/platform/service/src/lambda/**`; `backend/libs/platform/internal-api/src/signing/**`; `backend/libs/platform/adapters/aws/src/sigv4/**`                                                          | Deployment with OIDC to AWS, per service, according to section 10; publishing of the web and the mobile app; `bootstrapLambda` and `SigV4Signer` (table 2.1)                                                                                  | `terraform test` and `tf-validate` green; a test service (fixture) goes through migrate, apply and publish on Fargate and on Lambda; the `InternalRequestSigner` contract test passes with both signers; no long-lived keys in the repository | None              |

Troop 1 of wave 5 (WP2 and WP6 of F4) touches none of the above. If the identity skeleton (WP6) needs the new permissions, the general adds them when integrating.

### 11.2 Waves 6 to 9: build and review cycles

From wave 6 on, each wave is a cycle with two Opus agents: a builder that plans, implements and tests, and an independent reviewer that reads the full diff, runs the verification and returns findings without editing. The builder fixes and the reviewer reviews again, up to two rounds (`phase-cycle` flow). Then the general integrates, verifies, opens the PR and merges it with green checks, and starts the next cycle without waiting for the user. The user reviews everything at the end; their corrections run as one more cycle with the same flow.

Phases are grouped by dependency: each service brings its Terraform stack, each platform library is born in the cycle that uses it and WP15 of F4 goes in with identity.

| Wave | Phases          | What it builds                                                                                                                                                                                                                                              | Closes                                                                                                                                                 |
| ---- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 6    | F4              | WP7 to WP14 on the facades and fakes of WP6, and WP15 (e2e and identity access matrix)                                                                                                                                                                      | Cards of WP7 to WP15 of the F4 design                                                                                                                  |
| 7    | F5 and F6       | `tasks` and `notifications` services with their tfvars; `@platform/flags`, `@platform/search` with its two modes, `features` and `flags` in `auth` and `http`; `@platform/realtime` with SSE and Socket.IO, `apps/realtime` and SES (sections 3.5, 4 and 5) | Integration over two shards; Mailpit receives an email; contract test of each port with all its adapters; reconnection without loss on both transports |
| 8    | F7 and F8       | `reports` and `billing` services with their tfvars; `@platform/quotas` and `@platform/metering`; `TenantOnboarding` and `DeleteAccount` sagas; metering and projections across services (sections 6, 7, 8.1 to 8.3)                                         | Each saga with `CrashingSagaStore`; tenant creation, plan change, invoice, delinquency and reactivation flow                                           |
| 9    | F9, F10 and F11 | Business screens and app scenarios (section 9); regions, real sharding and `MoveTenant` with its two strategies and its two gates (8.4); generators, OpenAPI, ARCHITECTURE, ADRs and runbooks (8.5); the final visual map                                   | Front checks; move between groups and regions without loss; a generated service and module pass `lint test typecheck build`                            |

## 12. Tests and definition of done

- **Unit.** With the fakes of each facade and port, deterministic clock and `IdGenerator`. Domain without Nest or TypeORM.
- **Integration** (`pgvector/pgvector:0.8.7-pg17` and `valkey/valkey-bundle:8.1.11`, as in [F4, section 8](f4-identity.md#8-tests-and-definition-of-done)). Each module tests its rows in the shard computed by the router, with at least one user or tenant in each of the two shards. They are skipped without Docker.
- **E2E per route**, with the full app, real Postgres and Valkey and the in-memory bus; one authorization e2e per service with the access matrix (no token, no permission, no feature, with a disabled flag and with expired step-up where it applies).
- **Sagas.** Each one with `CrashingSagaStore` and declared compensation per operation, and the rule "steps before the pivot with compensation, after it idempotent".
- **Front.** `analyze`, `format-check`, `test`, `check_microfrontend_boundaries` and `check_deferred_chunks`.
- **A package is done** with `pnpm nx affected -t lint test typecheck build`, coverage of 80 % (lines, statements and functions) and 75 % (branches) per project, `contracts-export:check` and `dart run contracts_gen --check` when it touches contracts, no literals for events, permissions, codes, queues or jobs, no secrets and no dependencies outside section 13.
- **F5 to F11 are done** when wave 7 passes the end-to-end flow twice in a row and ARCHITECTURE and ADRs 0008, 0010, 0011, 0013 and 0014 reflect what was built.

## 13. External dependencies

| Need                     | Decision                                                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email on AWS             | Library: `@aws-sdk/client-sesv2`, isolated in `SesEmailSender`. Implementing the signed SES protocol (SigV4) by hand would be unwise.                                                               |
| Local email (Mailpit)    | In-house: `SmtpEmailSender` on `node:net`, without authentication or TLS, only with `DEPLOY_ENVIRONMENT=local`. `nodemailer` is discarded.                                                          |
| Email templates          | In-house: classes with strings and `escapeHtml`. React Email and MJML are discarded.                                                                                                                |
| Feature flags            | In-house: `@platform/flags`. OpenFeature is discarded.                                                                                                                                              |
| Real time                | In-house SSE on `text/event-stream` and Valkey Stream. Socket.IO with its library and the streams adapter, because reimplementing its protocol is unwise.                                           |
| Real push                | Out of F6 (ports and fakes). Web Push requires payload encryption (RFC 8291): when it arrives, `web-push` is a reasonable candidate.                                                                |
| Report CSV and JSON      | In-house: CSV writer with quoting and escaping.                                                                                                                                                     |
| Data copy between shards | In-house: batches with TypeORM (`BatchCopyTransfer`) and logical replication with PostgreSQL publications and subscriptions via SQL (`LogicalReplicationTransfer`). `pg-copy-streams` is discarded. |
| Generators and OpenAPI   | In-house: text templates and an OpenAPI 3.1 exporter. `@nx/devkit` and `@nestjs/swagger` are discarded.                                                                                             |
| Cron and jobs            | They already exist (`@platform/scheduling`).                                                                                                                                                        |

| Package                            | Exact version | Published  | Where                             | Why it is not built in-house                                                                                                                               | Discarded alternative                                                                    |
| ---------------------------------- | ------------- | ---------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `@aws-sdk/client-sesv2`            | `3.1160.0`    | 2026-10-29 | `libs/platform/adapters/aws`      | Signing and calling the SES API with SigV4 and retries is cryptography and protocol foreign to the product. Same version as `client-sns` and `client-sqs`. | `fetch` with an in-house SigV4 signature: more code and more risk than the client.       |
| `socket.io`                        | `4.8.4`       | 2026-09-25 | `libs/platform/realtime`          | Protocol with transport, reconnection and state recovery; reimplementing it is unwise.                                                                     | In-house WebSocket on `node:http`: another protocol to maintain and no existing clients. |
| `@socket.io/redis-streams-adapter` | `0.3.1`       | 2026-03-12 | `libs/platform/realtime`          | Distributes messages across instances and provides connection state recovery over a stream, as ADR 0011 requires. Tested with `iovalkey`.                  | `@socket.io/redis-adapter`: Pub/Sub without state recovery.                              |
| `@nestjs/websockets`               | `12.3.2`      | 2026-10-27 | `libs/platform/realtime/src/nest` | NestJS gateway, same version as the rest of NestJS.                                                                                                        | Socket.IO server mounted by hand outside NestJS.                                         |
| `@nestjs/platform-socket.io`       | `12.3.2`      | 2026-10-27 | `libs/platform/realtime/src/nest` | NestJS adapter for Socket.IO.                                                                                                                              | The same.                                                                                |

The dates were checked with `npm view` on November 16, 2026: all are more than two weeks old. They are pinned exactly, without `^` or `~`. SES and the real-time ones are added to `backend/package.json` by the wave 7 cycle; the general integrates the lockfile.

## 14. Outside F5 to F11

| Piece                                                                                         | How it is simulated or postponed                                                                                  | Phase     |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------- |
| `files` service, attachments and `StorageGb`                                                  | No `StorageGb` source; reports store the result in the row                                                        | Later     |
| Outgoing webhooks                                                                             | Nothing                                                                                                           | Later     |
| Real `EmbeddingProvider` adapter, AI module and `assistant`                                   | Deterministic embeddings fake; `assistant` keeps demo data                                                        | Later     |
| Real push (APNs, FCM, Web Push)                                                               | `InMemoryPushSender` in `local` and `dev`, `NonePushSender` in `staging` and `prod`                               | Later     |
| SES bounce and complaint events, open tracking pixel                                          | Only the `email_suppressions` table and the port                                                                  | Later     |
| `backoffice-api`, new `backoffice` screens, platform reports                                  | `backoffice` data stays demo data                                                                                 | Later     |
| Real charging, electronic invoicing with the DIAN                                             | `FakePaymentProvider` in `local` and `dev`, `NonePaymentProvider` in `staging` and `prod`, and internal numbering | After F12 |
| `agreements`, DPoP, export to a data lake, SLOs, cross-region recovery, automatic rebalancing | Nothing                                                                                                           | After F12 |

## 15. Decisions that require the user

Each decision has options and a recommendation. The user approved all recommendations on November 16, 2026.

1. **What goes into F5 "capabilities".** (a) In-house feature flags and text search; files and webhooks out. (b) Add a `files` service. (c) Add outgoing webhooks. **I recommend (a).** The four wave 5 contracts do not include `files`, F4 leaves flags for F5 and the `tasks` screen asks for text search. Flags live in each environment's configuration (`ConfigFlagStore`); an editable table in the catalog needs the `backoffice-api`, which does not exist.
2. **Task fields and who is notified.** (a) Only title, description and status, and `createdBy` is notified when someone else changes it. (b) Add assignee, due date and priority. **I recommend (a).** It is what today's screen shows; `NotificationType.taskUpdated` needs a recipient and `createdBy` is the only one that exists.
3. **Default search.** The template ships both `SearchIndex` modes (table 2.1). (a) `SEARCH_MODE=text` by default, with `tsvector` in Spanish. (b) `hybrid` by default. **I recommend (a).** Hybrid mode needs a real `EmbeddingProvider`, which arrives with the AI module; until then it runs with the fake in tests.
4. **Default real time.** The template ships SSE and Socket.IO, authentication by access token and by cookie, and the module mountable inside a service or in `apps/realtime` (table 2.1). (a) By default, both transports, mounted inside `notifications` and with access token. (b) By default, a separate `apps/realtime`, as ADR 0011 says. **I recommend (a).** It saves one deployed service in the initial configuration; moving to (b) means changing `REALTIME_HOST` and deploying the app.
5. **F6 channels.** (a) Email through SES on AWS and SMTP only locally, push only with ports and fakes, in-house templates in TypeScript. (b) Also real APNs, FCM and Web Push. (c) Templates with React Email or MJML. **I recommend (a).** The real push channels require Apple and Firebase accounts that only the user has, and in-house templates avoid two dependencies; (b) and (c) fit later without touching the ports.
6. **Time zone of quiet hours.** (a) A `timezone` field in the preferences, which the client fills the first time it saves. (b) Fix UTC. (c) Use one zone per tenant. **I recommend (a).** A "22:00 to 07:00" schedule without a zone cannot be applied; (c) requires a tenant attribute that identity does not have.
7. **Template reports and export.** (a) `TasksByStatus`, `TasksActivity`, `InvoicesSummary` and `NotificationsDelivery`, in JSON and CSV, with the result stored in the row (up to `REPORTS_MAX_RESULT_BYTES`) and expiry by `REPORTS_RESULT_TTL_DAYS`. (b) Results in S3. (c) Add PDF or XLSX. **I recommend (a).** Each report comes from a service already built; (b) and (c) require `files` and format libraries.
8. **CSV as a plan feature.** (a) CSV export requires `PlanFeature.AdvancedReports`. (b) All plans have it. **I recommend (a).** It exercises entitlements end to end with the example route; the rule is one line that can be removed.
9. **New `reports` microfrontend in F9.** (a) Yes, generated with the P4.3 script. (b) There is no screen and `reports` is used only through the API. **I recommend (a).** Without a screen, F7 is not visible and there is no way to test the new permissions from the front.
10. **Seed plans, trial and grace.** (a) Seed Inicio, Pro and Empresa with the front's demo values, editable in the catalog, and require `BILLING_TRIAL_DAYS` and `BILLING_GRACE_DAYS` in the configuration (no default value in the code; the local environment uses 14 and 7). (b) Other plans or prices. **I recommend (a).** Prices are a business decision and the repository must not fix them; the README's dunning cycle gives no figures.
11. **What happens when a quota is exceeded.** (a) It is blocked with `BILLING.QUOTA.EXCEEDED` (as ARCHITECTURE says) and the invoice usage lines only exist for metrics with a unit price in the plan. (b) The overage is billed. **I recommend (a).** It is what was already decided; the front meter flags danger at 100 % and the seed plans define no unit price.
12. **What is metered and how.** (a) `ApiCalls` counts the requests of service accounts with an API key; `Users` is computed in `billing` from the membership events; `StorageGb` has no source. Metering travels as the command `billing.usage.record.v1`, not as the `BillingEvent.UsageRecorded` event of ARCHITECTURE. (b) Count all requests. (c) Keep the event and allow other services to publish to the `billing` topic. **I recommend (a).** "API calls" is integration usage; the contract kit only lets an event's owner publish it, and the command with `sends` is how a service asks another one for work.
13. **System roles.** The table in 3.3 (Owner everything; Admin without `billing:write`; Member without write reports or billing; Billing only billing and report reads). Alternative: Admin with `billing:write`. **I recommend the table.** Changing a plan has a cost, so it stays with Owner and Billing; it is a one-row change.
14. **Asynchronous `POST /v1/tenants`.** (a) It responds 202 with `{ tenantId, sagaId }` and the client queries `GET /v1/sagas/{sagaId}`. (b) It waits for the saga to finish and responds 201. **I recommend (a).** The saga crosses three services and can retry; the F4 client does not change screens, only the wait.
15. **Account deletion.** (a) No grace period: the account is suspended and deleted on the spot; tasks are kept without an author. (b) Grace of N days with a job. **I recommend (a).** It is an example saga; whoever needs grace adds a job that starts the saga. It is also confirmed that invoices are not deleted.
16. **Template regions.** (a) Two regions identified with Terraform's AWS ids (`us-east-1`, `sa-east-1`), with the second one simulated locally by a second Postgres and Valkey. (b) Country codes (`co`, `us`) like the ARCHITECTURE example. (c) Only `dev` with two regions and `prod` with one. **I recommend (a).** Terraform state is already stored per `<region>`, and names are not translated between the catalog and the infrastructure; the backoffice demos (`euWest`, `usEast`, `saEast`) are test data. Wave 9 only writes the second `dev`; `staging` and `prod` are defined by the user.
17. **Default move.** The template ships `BatchCopyTransfer` and `LogicalReplicationTransfer`, and `DirectoryWriteGate` and `ValkeyWriteGate` (table 2.1). (a) By default, batch copy and the directory gate. (b) By default, logical replication and the Valkey lock, as ARCHITECTURE and ADR 0010 say. **I recommend (a).** Logical replication requires `wal_level=logical`, replication roles and networking between regions, which not every environment has; with (a) the move works on any PostgreSQL. The wave 9 cycle updates ADR 0010 to name both strategies.
18. **Generators and documentation.** (a) In-house classes with templates, exposed as Nx targets, and OpenAPI in JSON from `contract.json`. (b) Generators with `@nx/devkit` (`nx g`) and a Scalar page. **I recommend (a).** Zero new dependencies; `nx run` is enough for two generators and the documentation portal stays out of the plan.
19. **Default runtime and F9 scope.** Each service ships `main.ts` and `lambda.ts` (table 2.1). (a) `fargate` by default in the four services and F9 limited to `tasks`, `notifications`, `billing` and `reports`; `backoffice` and `assistant` stay in demo mode until their APIs exist. (b) Some service on `lambda` by default. (c) Include `backoffice` with a minimal `backoffice-api`. **I recommend (a).** The workers and real time need long-lived processes; an API-only service switches to Lambda with one tfvars line.
