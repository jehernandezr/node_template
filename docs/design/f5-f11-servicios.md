# Diseño de las fases F5 a F11: servicios de ejemplo, negocio y escala

- Estado: Aprobado el 2026-11-16, con la recomendación de cada decisión de la sección 15
- Fecha: 2026-11-16
- ADR relacionados: [0007](../adr/0007-mensajeria-topologia-tipada-sns-sqs-cloudevents.md), [0008](../adr/0008-sagas-orquestadas-bitacora-persistente.md), [0010](../adr/0010-sharding-logico-residencia-region.md), [0011](../adr/0011-tiempo-real-socketio-sse.md), [0013](../adr/0013-modulo-ia-puertos-claude.md), [0014](../adr/0014-acuerdos-documentos-firmados.md), [0020](../adr/0020-terraform-por-stacks-y-runtime-por-servicio.md), [0023](../adr/0023-enrutamiento-de-datos-de-identity.md), [0024](../adr/0024-persistencia-typeorm-sharding-y-sagas-persistentes.md), [0025](../adr/0025-capa-nestjs-por-sub-entrada-y-puertos-abstractos.md) y [0026](../adr/0026-jobs-programados-scheduledjob-y-joblock.md)

Este documento reparte la construcción de los servicios `tasks`, `notifications`, `reports` y `billing`, de sus pantallas, de las sagas de ejemplo, del sharding real y de los generadores en las tropas de las olas 5 a 7 del [plan](../plan/README.md#orden-de-ejecución-por-olas). No contiene código de producción: fija nombres, carpetas, contratos, tablas, eventos, colas, permisos, paquetes y decisiones. Sigue el formato del [diseño de F4](f4-identity.md) y no repite lo que ese documento ya fija: la estructura de un servicio ([sección 4](f4-identity.md#4-estructura-de-backendappsidentity)), las piezas de plataforma ([sección 3](f4-identity.md#3-piezas-de-plataforma-nuevas)) y las reglas de paquetes ([sección 6](f4-identity.md#6-paquetes-de-trabajo)).

Donde este documento y un ADR se contradicen, manda el ADR, salvo en lo que la sección 15 propone cambiar. Los datos de demostración de los microfrontends son la fuente de lo que piden los contratos: no se agregan campos ni pantallas que hoy no existan salvo los que la sección 15 aprueba.

## 1. Punto de partida y alcance

### 1.1 Estado de partida (ola 5, con la ola 4 integrada)

| Pieza          | Estado                                                                                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contratos      | Solo `@contracts/platform` (kit, `MoneyAmount`, `PageQuerySchema`, catálogo `PLATFORM.*`) y `@contracts/identity`. No hay contrato de `tasks`, `notifications`, `reports` ni `billing`.                                                    |
| Plataforma     | `kernel`, `config`, `observability`, `persistence` (TypeORM), `sharding`, `messaging`, `internal-api`, `saga` (motor con bitácora persistente), `scheduling` (`ScheduledJob`), `cache`, `bloom`, `rate-limit`, `resilience` y adaptadores. |
| F4             | Con la ola 4: `@platform/auth` y `@platform/service`. En la ola 5 llegan `@platform/http` y el esqueleto de identity; en la 6, los módulos de identity.                                                                                    |
| Entorno local  | `catalog`, `identity_shard_0`, `identity_shard_1` y `tasks_shard_0` en Postgres 17 con `vector`; Valkey, LocalStack (SNS, SQS, SES, S3, scheduler), Mailpit y OpenObserve.                                                                 |
| Terraform      | Stacks `network`, `platform`, `data`, `messaging`, `edge` y `service` (se instancia por servicio en `environments/<ambiente>/services/<servicio>/`).                                                                                       |
| Front          | `tasks`, `notifications`, `billing`, `verifier`, `assistant`, `account` y `backoffice` con repositorios `Fake*` y `RepositoryBinding.demoOnly`. No existe un microfrontend `reports`.                                                      |
| `backend/apps` | Solo existe lo que construye la ola 4 y 5 (identity). Nada de los cuatro servicios.                                                                                                                                                        |

### 1.2 Alcance por fase

| Fase | Entra                                                                                                                                                                                                                                         | Ola                         | Queda fuera (ver sección 14)                                      |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| F5   | Servicio `tasks` (CRUD, búsqueda con `@platform/search` en modo texto o híbrido, borrado de datos de usuario) y las capacidades: feature flags (`@platform/flags`, `features` y `flags` en la ruta) y jobs sobre `ScheduledJob` ya existente. | 5, 7                        | Archivos, webhooks salientes                                      |
| F6   | Servicio `notifications`: bandeja, preferencias, despacho por canal, email (SES o SMTP), push por puertos con fakes, y tiempo real con `@platform/realtime` (SSE, Socket.IO o ambos), dentro del servicio o en `apps/realtime`.               | 5, 7                        | Push real (APNs, FCM, Web Push), eventos de rebote de SES         |
| F7   | Servicio `reports` (catálogo de reportes, ejecuciones, proyecciones por eventos) y las sagas de ejemplo `TenantOnboarding` y `DeleteAccount`.                                                                                                 | 5, 8                        | PDF y XLSX, reportes de plataforma en backoffice                  |
| F8   | Servicio `billing`: planes, suscripciones, medición, entitlements, cuotas, facturas, morosidad y puerto `PaymentProvider` con un fake. Medición desde los servicios.                                                                          | 5, 8                        | Cobro real, factura electrónica ante la DIAN                      |
| F9   | Pantallas de `tasks`, `notifications`, `billing` y un microfrontend `reports` nuevo contra la API real, con el Dart de la ola 5. `backoffice` y `assistant` siguen con datos de demostración.                                                 | 9                           | Pantallas nuevas que hoy no existen                               |
| F10  | Varias regiones (registro, URL regional, `WRONG_REGION`), `MoveTenant` entre grupos y regiones, y dos shards por servicio en local y en las pruebas.                                                                                          | 9                           | Rebalanceo automático, recuperación ante desastres entre regiones |
| F11  | Generadores de servicio y de módulo, OpenAPI desde `contract.json`, WP15 de F4 y la documentación de lo construido.                                                                                                                           | 9                           | Portal de documentación                                           |
| F12  | Pipeline con OIDC hacia AWS, publicación de la web y la app móvil, entrada Lambda y firma SigV4 (ola 5, tropa 3); tfvars, runtime y stack por servicio (ola 6).                                                                               | 5 y la ola de cada servicio | Nada de F12: lo que sigue está en la lista posterior del README   |

## 2. Decisiones clave

0. **La plantilla ofrece las alternativas, no elige por el usuario.** Cada tecnología que un ADR o ARCHITECTURE nombra como opción es un puerto (clase abstracta) con un adaptador por alternativa, y quien usa la plantilla elige por configuración o por tfvars, por servicio. La plantilla trae todos esos adaptadores probados. Solo quedan como puerto con fake los que exigen cuentas externas del usuario (APNs, FCM, Web Push) o un módulo que ninguna fase de este documento construye. La tabla 2.1 lista las alternativas.

1. **Todos los contratos en la ola 5, una sola tropa.** Un contrato solo depende del kit. Las rutas, operaciones, eventos, comandos, colas y errores de los cuatro servicios, más lo que identity necesita para las sagas, entran juntos con su Dart y sus textos ARB. Los servicios de la ola 6 no editan contratos (decisión 7 de [F4](f4-identity.md#2-decisiones-clave)).
2. **Cada servicio es una app con la estructura de F4.** `bootstrapHttp` y `bootstrapWorker` de [`@platform/service`](f4-identity.md#35-platformservice-arranque), módulos con las cuatro capas, fachadas abstractas y fakes en `modules/<m>/__tests__/utils/`. Un módulo importa de otro solo su `index.ts`.
3. **Datos de tenant en el shard del tenant, datos de usuario en el shard del usuario** ([ADR 0023](../adr/0023-enrutamiento-de-datos-de-identity.md)). `tasks`, `billing` y `reports` usan `ShardKey.Tenant`. La bandeja y las preferencias de `notifications` usan `ShardKey.User` con el `homeTenantId` del usuario, así que todo evento que nombra a un usuario lleva su `UserRef` (`{ userId, homeTenantId }`).
4. **Los servicios no leen la base de otros.** Se hablan por operaciones internas con compensación declarada, por eventos y por comandos. `reports` arma sus propias proyecciones con eventos y, para completar historia, llama a una operación de lectura paginada del dueño del dato.
5. **Acceso por la ruta.** Los permisos nuevos, las funcionalidades del plan y los flags se declaran con `Access.authenticated({ permissions, features, flags })` en la ruta del contrato (como el step-up en F4), y `evaluateAccess` los comprueba con el `AccessGrant` que ya trae `features` y `flags`. Sin opciones nuevas en `@Endpoint`.
6. **Medición como comando.** Los servicios envían `billing.usage.record.v1` a la cola de `billing`. El kit exige que el dueño de un evento sea quien lo publica, así que `BillingEvent.UsageRecorded` de la arquitectura pasa a ser un comando (decisión 12 de la sección 15).
7. **Runtime elegible por servicio** ([ADR 0020](../adr/0020-terraform-por-stacks-y-runtime-por-servicio.md)). Cada servicio trae `main.ts` (Fargate) y `lambda.ts` (Lambda) sobre `@platform/service`; `api.runtime` en sus tfvars elige. El valor por defecto de la plantilla es `fargate`.
8. **En casa salvo protocolos ajenos.** Lo propio va sobre la librería estándar. Las dependencias nuevas son el cliente de SES y Socket.IO con su adaptador de streams (sección 13), porque reimplementar el protocolo de Socket.IO es imprudente.

### 2.1 Alternativas que la plantilla trae

| Pieza                                    | Puerto                                   | Adaptadores                                                                                                            | Cómo se elige                         | Origen                                                       |
| ---------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| Tiempo real                              | `RealtimeTransport`                      | `SseTransport`, `SocketIoTransport` (streams de Valkey para escalar y recuperar)                                       | `REALTIME_TRANSPORTS` (uno o ambos)   | [ADR 0011](../adr/0011-tiempo-real-socketio-sse.md)          |
| Credencial del canal en tiempo real      | `StreamAuthenticator`                    | `BearerStreamAuthenticator` (access token), `CookieStreamAuthenticator` (cookie de sesión, verificada contra identity) | `REALTIME_AUTH`                       | ADR 0011                                                     |
| Lugar del tiempo real                    | `RealtimeModule` de `@platform/realtime` | montado dentro de un servicio o en `apps/realtime`                                                                     | `app.module.ts` del servicio o la app | ADR 0011                                                     |
| Runtime                                  | `bootstrapHttp`, `bootstrapLambda`       | Fargate, Lambda                                                                                                        | `api.runtime` en tfvars               | ADR 0020                                                     |
| Firma de llamadas internas               | `InternalRequestSigner`                  | `HmacSigner`, `SigV4Signer`                                                                                            | `INTERNAL_API_SIGNER`                 | ARCHITECTURE                                                 |
| Búsqueda                                 | `SearchIndex`                            | `PostgresTextSearch` (`tsvector`), `PostgresHybridSearch` (pgvector y `EmbeddingProvider`)                             | `SEARCH_MODE`                         | ARCHITECTURE                                                 |
| Correo                                   | `EmailSender`                            | `SesEmailSender`, `SmtpEmailSender`                                                                                    | `EMAIL_TRANSPORT`                     | ARCHITECTURE                                                 |
| Plantillas de correo                     | `TemplateRenderer`                       | `TypeScriptTemplateRenderer`                                                                                           | solo uno; el puerto admite otros      | este diseño                                                  |
| Push                                     | `PushSender`                             | `InMemoryPushSender` (APNs, FCM y Web Push piden cuentas del usuario)                                                  | `PUSH_TRANSPORT`                      | ARCHITECTURE                                                 |
| Flags                                    | `FlagStore`                              | `ConfigFlagStore`, `InMemoryFlagStore`                                                                                 | `FLAGS_STORE`                         | este diseño                                                  |
| Resultado de reportes                    | `ReportResultStore`                      | `RowReportResultStore`; S3 llega con `files`                                                                           | `REPORTS_RESULT_STORE`                | este diseño                                                  |
| Traslado de tenant                       | `TenantDataTransfer`                     | `BatchCopyTransfer` (lotes y rondas delta), `LogicalReplicationTransfer` (replicación lógica de PostgreSQL)            | `TENANT_MOVE_STRATEGY`                | [ADR 0010](../adr/0010-sharding-logico-residencia-region.md) |
| Bloqueo de escritura durante el traslado | `TenantWriteGate`                        | `DirectoryWriteGate` (directorio de shards), `ValkeyWriteGate` (candado en Valkey)                                     | `TENANT_WRITE_GATE`                   | ADR 0010                                                     |
| Cobro                                    | `PaymentProvider`                        | `FakePaymentProvider`                                                                                                  | el real llega después de F12          | ARCHITECTURE                                                 |

El `EmbeddingProvider` de la búsqueda híbrida trae un fake determinista; el adaptador real llega con el módulo de IA ([ADR 0013](../adr/0013-modulo-ia-puertos-claude.md)).

## 3. Lo común a los cuatro servicios

### 3.1 Anatomía

Cada servicio sigue la [sección 4 de F4](f4-identity.md#4-estructura-de-backendappsidentity): `backend/apps/<servicio>/`, `src/{instrumentation,main,worker,migrate,<servicio>.service,app.module}.ts`, `config/`, `database/`, `messaging/`, `shared/{enums,constants,types,utils}` y `modules/<módulo>/{index.ts,domain,application,infrastructure,presentation,__tests__/utils}`. Reglas de lint, tags (`type:app`, `scope:<servicio>`) y pruebas idénticas. `main.ts` sirve la API; `worker.ts` corre el relay del outbox, los consumidores y los jobs.

Enums por servicio (todos en el contrato salvo los de la app):

| Enum                                                                                         | Dónde          | Valores de ejemplo                                        |
| -------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------- |
| `<S>ErrorCode`, `<S>Route`, `<S>Operation`, `<S>Event`, `<S>Command`, `<S>Topic`, `<S>Queue` | contrato       | `TASKS.TASK.NOT_FOUND`, `tasks.task.list`, `tasks-events` |
| `<S>Resource`, `<S>Job`, `<S>CacheKey`                                                       | `shared/enums` | `TasksResource.Tasks`, `BillingJob.CloseInvoicePeriods`   |

Los ids de ruta son `servicio.recurso.acción`; los de operación, comando y evento llevan `.vN` ([kit de contratos](../../backend/libs/contracts/platform/src/kit/define-operation.ts)). Los errores son `SERVICIO.SUBMÓDULO.ERROR` con su entrada en el catálogo del servicio y textos es y en.

### 3.2 Shards locales y bases

`backend/infra/local/postgres/init.sql` (lo edita el general) crea `<servicio>_shard_0` y `<servicio>_shard_1` para `tasks`, `notifications`, `reports` y `billing`, con `vector`, como ya hace con identity: el enrutamiento se ejercita desde el primer día. Las tablas de referencia van en `catalog` con el prefijo del servicio.

| Servicio        | Tablas por shard de tenant                                                                                             | Tablas por shard de usuario                                            | Catálogo                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| `tasks`         | `tasks`                                                                                                                | ninguna                                                                | ninguna                                |
| `notifications` | `email_messages`                                                                                                       | `notifications`, `notification_preferences`, `notification_deliveries` | `email_suppressions`                   |
| `reports`       | `report_runs`, `proj_tasks`, `proj_invoices`, `proj_deliveries`                                                        | ninguna                                                                | ninguna                                |
| `billing`       | `subscriptions`, `usage_records`, `usage_totals`, `invoices`, `invoice_lines`, `invoice_sequences`, `payment_attempts` | ninguna                                                                | `billing_plans`, `billing_plan_quotas` |

Todas las tablas de shard llevan `created_at`, `updated_at`, `created_by`, `updated_by` y `version`; las de tenant declaran `tenant_id` y tienen RLS; las marcadas "auditada" llevan el trigger de `audit_log` ([F4, sección 5](f4-identity.md#5-módulos)). Cada módulo usa su bloque de timestamps de migración, declarado en `shared/constants/migration-ranges.constants.ts` del servicio. Las entidades y migraciones salen del CLI de TypeORM (`migration-generate`), nunca a mano.

### 3.3 Permisos y roles de sistema

El catálogo `Permission` vive en `@contracts/identity`. Hoy trae `tasks:read`, `tasks:write`, `billing:read`, `billing:write` y `backoffice:access`; sirven a `tasks` y `billing` sin cambios. Se agregan dos:

| Permiso        | Valor           | Rutas que lo exigen                                |
| -------------- | --------------- | -------------------------------------------------- |
| `ReportsRead`  | `reports:read`  | Catálogo, lista y detalle de ejecuciones, descarga |
| `ReportsWrite` | `reports:write` | Crear una ejecución                                |

`notifications` no tiene permisos de tenant: sus rutas son `Access.authenticated()` y cada usuario solo toca lo suyo. Reparto en los roles de sistema (`shared/constants/system-roles.constants.ts` de identity; el general agrega las filas de `reports:*` al integrar la ola 5):

| Permiso                     | Owner | Admin | Member | Billing |
| --------------------------- | ----- | ----- | ------ | ------- |
| `tasks:read`, `tasks:write` | sí    | sí    | sí     | no      |
| `reports:read`              | sí    | sí    | sí     | sí      |
| `reports:write`             | sí    | sí    | no     | no      |
| `billing:read`              | sí    | sí    | no     | sí      |
| `billing:write`             | sí    | no    | no     | sí      |

`PlanFeature` suma `AdvancedReports = 'advanced_reports'` (decisión 8). `FeatureFlag.NewReports` ya existe y gobierna el acceso a `reports`.

### 3.4 Cambios de contrato en `@contracts/platform` y `@contracts/identity` (tropa 2, ola 5)

| Contrato | Cambio                                                                                                                                                                                                                                                                                                    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| platform | `Access.authenticated` y `AccessRequirement` suman `features` y `flags` (texto, como `permissions`). Códigos `PLATFORM.ACCESS.FEATURE_NOT_INCLUDED` (403) y `PLATFORM.ACCESS.FLAG_DISABLED` (404, el flag apagado se comporta como ruta inexistente).                                                     |
| platform | Esquemas `UserRefSchema` (`{ userId, homeTenantId }`) y `CalendarDateSchema` (`AAAA-MM-DD`). Fábrica `defineTenantMoveOperations(servicio)` con las cuatro operaciones de traslado (sección 8.4) y sus esquemas.                                                                                          |
| identity | Enums: `Permission.ReportsRead` y `ReportsWrite`, `PlanFeature.AdvancedReports`, `IdentitySaga` (`identity.tenant-onboarding`, `identity.delete-account`, `identity.move-tenant`).                                                                                                                        |
| identity | Rutas: `POST /v1/me/deletion` (step-up, inicia `DeleteAccount`) y `GET /v1/sagas/{sagaId}` (estado de una saga del propio usuario o tenant). `POST /v1/tenants` pasa a responder 202 con `{ tenantId, sagaId }` (decisión 14). La respuesta de `sign-in` suma `region` y `apiBaseUrl`.                    |
| identity | Operaciones: `identity.tenants.activate.v1` (sin compensación, va después del pivote), `identity.users.erase.v1` (sin compensación), `identity.devices.list-push-targets.v1` y `identity.members.list-by-permission.v1` (lecturas), y las cuatro de traslado de `defineTenantMoveOperations('identity')`. |
| identity | Evento `identity.user.erased.v1`. Cola `identity-billing`, suscrita a `billing-events` (`subscription.suspended`, `subscription.reactivated`, `entitlements.changed`). `sends` de `billing.usage.record.v1`.                                                                                              |

Las operaciones nuevas de identity quedan registradas como stub (`PLATFORM.INTERNAL.UNEXPECTED`) por el general al integrar la ola 5, porque el esqueleto de identity (WP6) se escribe a la vez; sus handlers reales los escribe la tropa 1 de la ola 7.

### 3.5 Piezas de plataforma nuevas

| Librería                   | Carpeta                                                             | Ola, tropa | Contenido                                                                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@platform/flags`          | `backend/libs/platform/flags`                                       | 7          | `FlagEvaluator`, `FlagStore`, `ConfigFlagStore`, `InMemoryFlagStore`, `FlagContext` (tenant, usuario, plan, grupos). Rollout por porcentaje con hash estable de `flag:usuario`. Identity la usa para llenar `UserAccess.flags`. |
| cambio en `@platform/auth` | `libs/platform/auth/src/access`                                     | 7          | `evaluateAccess` y `AccessRequirement` comprueban `features` y `flags` contra el `AccessGrant`.                                                                                                                                 |
| cambio en `@platform/http` | `libs/platform/http`                                                | 7          | `EndpointGuard` traduce las dos decisiones nuevas a los códigos de la sección 3.4. Sin opciones nuevas de `@Endpoint`.                                                                                                          |
| `@platform/quotas`         | `backend/libs/platform/quotas`                                      | 8          | `QuotaChecker` (abstracta), `BillingQuotaChecker` (operación `billing.quotas.check.v1`, caché local de 10 s), `QuotaGuard` y decorador `@Quota(UsageMetric.X)`. Responde `BILLING.QUOTA.EXCEEDED`.                              |
| `@platform/metering`       | `backend/libs/platform/metering`                                    | 8          | `UsageRecorder`, `BufferedUsageRecorder` (contadores en Valkey, volcado por job), `ApiCallMeteringInterceptor` y `UsageFlushJob` (sección 8.3).                                                                                 |
| `@platform/tenant-move`    | `backend/libs/platform/tenant-move`                                 | 9          | `TenantMoveManifest`, `TenantDataTransfer`, `TenantMoveModule` (sección 8.4).                                                                                                                                                   |
| `@platform/realtime`       | `backend/libs/platform/realtime`                                    | 7          | `RealtimeTransport`, `SseTransport`, `SocketIoTransport`, `StreamAuthenticator` con sus dos adaptadores, `RealtimeModule` y recuperación con `Last-Event-ID` y connection state recovery sobre un Valkey Stream.                |
| `apps/realtime`            | `backend/apps/realtime`                                             | 7          | App mínima que monta `RealtimeModule` para quien prefiera el tiempo real aparte; consume la cola de entregas de `notifications`.                                                                                                |
| `@platform/search`         | `backend/libs/platform/search`                                      | 7          | `SearchIndex`, `PostgresTextSearch`, `PostgresHybridSearch`, `EmbeddingProvider` y su fake.                                                                                                                                     |
| `bootstrapLambda`          | `libs/platform/service/src/lambda`                                  | 5, tropa 3 | Entrada Lambda con el mismo `ServiceDefinition` que `bootstrapHttp`.                                                                                                                                                            |
| `SigV4Signer`              | `libs/platform/internal-api/src/signing` y `adapters/aws/src/sigv4` | 5, tropa 3 | `InternalRequestSigner` con `HmacSigner` (actual) y `SigV4Signer`.                                                                                                                                                              |
| SES                        | `libs/platform/adapters/aws/src/ses`                                | 7          | `SesEmailSender` sobre `@aws-sdk/client-sesv2`. Es el único lugar con `@aws-sdk/*` para correo.                                                                                                                                 |

## 4. `tasks` (F5)

Una tarea de la organización: título, descripción y estado. La dueña es la organización, no quien la crea.

### 4.1 Contrato `@contracts/tasks`

```ts
export enum TaskStatus {
  Open = 'open',
  InProgress = 'in_progress',
  Done = 'done',
}
// TaskSchema: id, title, description, status, version, createdAt, updatedAt, createdBy (UserRef)
// TasksLimits: titleMax 200, descriptionMax 5000 (valores iniciales, en constants/)
export const CreateTaskRoute = defineRoute({
  id: TasksRoute.CreateTask,
  method: HttpMethod.Post,
  path: '/v1/tasks',
  request: CreateTaskRequestSchema,
  response: TaskSchema,
  errors: [...SessionGuardErrors, PlatformErrorCode.ValidationInvalidInput],
  access: Access.authenticated({ permissions: [Permission.TasksWrite] }),
  description: 'Crea una tarea en el tenant activo.',
});
```

| Ruta (`TasksRoute`) | Método y path               | Acceso        | Pantalla que la usa                                                           |
| ------------------- | --------------------------- | ------------- | ----------------------------------------------------------------------------- |
| `tasks.task.list`   | `GET /v1/tasks`             | `tasks:read`  | `TasksListController`: `list` y `search` (`status`, `q`, `limit`, `after`)    |
| `tasks.task.get`    | `GET /v1/tasks/{taskId}`    | `tasks:read`  | `TaskDetailController`                                                        |
| `tasks.task.create` | `POST /v1/tasks`            | `tasks:write` | `TaskFormController` (alta)                                                   |
| `tasks.task.update` | `PATCH /v1/tasks/{taskId}`  | `tasks:write` | `TaskFormController` (edición) y cambio de estado; `expectedVersion` opcional |
| `tasks.task.delete` | `DELETE /v1/tasks/{taskId}` | `tasks:write` | Detalle y lista (borrado lógico)                                              |

| Elemento    | Detalle                                                                                                                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Errores     | `TASKS.TASK.NOT_FOUND` (404), `TASKS.TASK.VERSION_CONFLICT` (409, de `expectedVersion`), `TASKS.SEARCH.QUERY_TOO_SHORT` (400).                                                                                                                                                    |
| Eventos     | Tópico `tasks-events`: `tasks.task.created.v1`, `tasks.task.updated.v1` (campos cambiados, `statusBefore`, `statusAfter`, `actor`, `createdBy` como `UserRef`) y `tasks.task.deleted.v1`.                                                                                         |
| Operaciones | `tasks.tasks.list-changes.v1` (lectura paginada por `updatedAt`, para el relleno de `reports`); `tasks.user-data.erase.v1` (sin compensación: es posterior al pivote de `DeleteAccount`; anonimiza `created_by` y `updated_by`, las tareas se conservan); las cuatro de traslado. |
| Colas       | Ninguna. `tasks` solo publica.                                                                                                                                                                                                                                                    |

### 4.2 Módulos

| Módulo    | Responsabilidad                                                                    | Tablas (shard de tenant)                                                                                                    |
| --------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `tasks`   | Agregado `Task`, casos de uso de las cinco rutas, búsqueda de texto (`TaskSearch`) | `tasks` (auditada): título, descripción, `status`, `created_by`, `created_by_home_tenant_id`, `deleted_at`, `search_vector` |
| `privacy` | Operaciones `erase` y `list-changes`; el manifiesto de traslado                    | Ninguna propia                                                                                                              |

`search_vector` es una columna `tsvector` generada con la configuración `spanish` y un índice GIN; `PostgresTaskSearch` la consulta con `websearch_to_tsquery`. El índice por defecto es `(tenant_id, status, id)`, así la lista pagina por cursor UUIDv7.

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

`FakeTasksFacade` y `InMemoryTaskSearch` viven en `modules/tasks/__tests__/utils/`.

### 4.3 Jobs, configuración y capacidades

| Elemento                | Detalle                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `TasksJob.PurgeDeleted` | `ScheduledJob` diario, exclusivo: borra tareas con `deleted_at` anterior a `TASKS_DELETED_RETENTION_DAYS`.                                     |
| Flags                   | `tasks` no usa flags; ejercita las capacidades con `GET /v1/tasks` y la búsqueda. Los flags los ejercitan `reports` (`NewReports`) y identity. |
| Configuración           | `baseConfigSchema`, `databaseConfigSchema`, `valkeyConfigSchema` y `TASKS_DELETED_RETENTION_DAYS`.                                             |

## 5. `notifications` (F6)

Una sola entrada, `notify(userRef, type, data)`: el tipo fija la criticidad y las preferencias del usuario fijan los canales. Las alertas de seguridad salen siempre por todos los canales. El gateway de tiempo real es un módulo de este servicio ([ADR 0011](../adr/0011-tiempo-real-socketio-sse.md), con los ajustes de la decisión 4).

### 5.1 Contrato `@contracts/notifications`

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
// MandatoryNotificationTypes (constants/): [SecurityAlert], ignora preferencias y horario de silencio
```

| Ruta (`NotificationsRoute`)         | Método y path                                  | Acceso      | Pantalla que la usa                                        |
| ----------------------------------- | ---------------------------------------------- | ----------- | ---------------------------------------------------------- |
| `notifications.inbox.list`          | `GET /v1/notifications`                        | autenticado | `InboxController.fetchInbox` (páginas, más nuevas primero) |
| `notifications.inbox.unread-count`  | `GET /v1/notifications/unread-count`           | autenticado | `watchUnreadCount` y la insignia del menú                  |
| `notifications.inbox.mark-read`     | `POST /v1/notifications/{notificationId}/read` | autenticado | `markAsRead` (idempotente)                                 |
| `notifications.inbox.mark-all-read` | `POST /v1/notifications/read-all`              | autenticado | `markAllAsRead`                                            |
| `notifications.preferences.get`     | `GET /v1/notification-preferences`             | autenticado | `PreferencesController.fetchPreferences`                   |
| `notifications.preferences.save`    | `PUT /v1/notification-preferences`             | autenticado | `savePreferences`                                          |

`NotificationPreferences` lleva `enabled` (tipo a canales), `quietStart`, `quietEnd` (`HH:mm`) y `timezone` (IANA, decisión 6). Los textos `title` y `body` los genera el servidor en el idioma del usuario.

Con Socket.IO, el mismo flujo va por el namespace `/notifications` con los mismos tipos de trama; el front trae el adaptador SSE detrás de su puerto `NotificationsStream`. La transmisión SSE `GET /v1/notifications/stream` queda fuera del contrato (no es JSON de petición y respuesta), igual que `/health`. Envía tres tipos de trama: `notification` (la `AppNotification` nueva), `unread-count` y `session-closed`. Autentica con `Authorization: Bearer <access token>` y reanuda con `Last-Event-ID`.

| Elemento    | Detalle                                                                                                                                                                                                                                                                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Errores     | `NOTIFICATIONS.INBOX.NOT_FOUND` (404), `NOTIFICATIONS.PREFERENCES.INVALID_QUIET_HOURS` (400), `NOTIFICATIONS.EMAIL.RECIPIENT_SUPPRESSED` (interno), `NOTIFICATIONS.EMAIL.TEMPLATE_UNKNOWN` (interno), `NOTIFICATIONS.REALTIME.UNAUTHENTICATED` (401).                                                                                                |
| Eventos     | Tópico `notifications-events`: `notifications.notification.created.v1` (sin texto: tenant, tipo, canales usados; lo consume `reports`).                                                                                                                                                                                                              |
| Operaciones | `notifications.messages.send.v1` (correo transaccional con código de un solo uso: viaja por la API interna y nunca por el bus; sin compensación: un correo enviado no se retira), `notifications.users.notify.v1` (mismo motivo), `notifications.user-data.erase.v1` (sin compensación, posterior al pivote) y las cuatro de traslado.               |
| Colas       | `notifications-triggers` (suscrita a `identity-events`: `security-alert.raised` y `membership.changed`; a `tasks-events`: `task.updated`; a `billing-events`: `invoice.issued`; a `reports-events`: `run.completed`) y `notifications-realtime-control` (suscrita a `identity-events`: `session.revoked` y `tokens.revoked`, cierra conexiones SSE). |

### 5.2 Módulos

| Módulo        | Responsabilidad                                                                                                                                                                                                                                | Shard             |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| `inbox`       | Agregado `Notification` (`readAt`), lista, conteo, marcar leída; job `NotificationsJob.PurgeRead`                                                                                                                                              | Usuario           |
| `preferences` | `NotificationPreferences` por usuario y `DeliveryPolicy`: canales según tipo, preferencias, horario de silencio y presencia                                                                                                                    | Usuario           |
| `dispatch`    | `NotifyUser`, destinatario e idioma por `identity.users.get-profile.v1`, plantillas por tipo, reintento de entregas (`NotificationsJob.RetryDeliveries`, exclusivo, hasta 5 intentos)                                                          | Usuario           |
| `email`       | `EmailSender` (`SesEmailSender`, `SmtpEmailSender` para Mailpit, `InMemoryEmailSender`), plantillas versionadas y lista de supresión                                                                                                           | Tenant y catálogo |
| `push`        | `PushSender` por plataforma (`ApnsPushSender`, `FcmPushSender`, `WebPushSender`: en F6 solo `InMemoryPushSender`) y objetivos por `identity.devices.list-push-targets.v1`                                                                      | Ninguno           |
| `realtime`    | Monta `RealtimeModule` de `@platform/realtime` con los transportes de `REALTIME_TRANSPORTS`; `RealtimeFacade` publica en el Valkey Stream por usuario (`notifications:rt:*`). Con `REALTIME_HOST=app` no monta nada y `apps/realtime` atiende. |
| `triggers`    | Consumidores que traducen eventos a `NotifyUser`, con la tabla de abajo                                                                                                                                                                        | Ninguno           |

| Evento origen                                                | Destinatario                                                            | Tipo              |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------- |
| `identity.security-alert.raised.v1`                          | El usuario de la alerta, todos los canales                              | `SecurityAlert`   |
| `tasks.task.updated.v1`                                      | `createdBy`, si el actor es otra persona                                | `TaskUpdated`     |
| `billing.invoice.issued.v1`                                  | Miembros con `billing:write` (`identity.members.list-by-permission.v1`) | `InvoiceIssued`   |
| `identity.membership.changed.v1`, `reports.run.completed.v1` | El usuario afectado, o quien pidió el reporte                           | `AccountActivity` |

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

Cada fachada tiene su fake en `modules/<m>/__tests__/utils/`. Las plantillas son clases `EmailTemplate` con `render(vars, locale)`, un `escapeHtml` propio y una versión por plantilla; hay una por valor de `IdentityEmailTemplate` de F4, más bienvenida, tarea actualizada, factura emitida y reporte listo. El adaptador `NotificationsIdentityMailer` de identity (sección 11, ola 7) reemplaza al fake de F4.

Tablas: `notifications` (usuario: `id`, `type`, `title`, `body`, `locale`, `read_at`), `notification_preferences` (una fila por usuario), `notification_deliveries` (notificación, canal, estado, error, id del proveedor), `email_messages` (tenant: plantilla, versión, huella HMAC del destinatario, estado, `trace_id`; no guarda el cuerpo) y `email_suppressions` (catálogo: huella del correo, motivo). Valkey: `notifications:presence:{userId}` y `notifications:rt:{userId}`, siempre bajo el prefijo del servicio (ADR 0021).

Configuración: `NOTIFICATIONS_EMAIL_SENDER` (`memory`, `smtp` o `ses`; `smtp` solo con `NODE_ENV=development`), `SMTP_URL`, `NOTIFICATIONS_FROM_ADDRESS`, `NOTIFICATIONS_PUSH_SENDER` (`memory`), `NOTIFICATIONS_INBOX_RETENTION_DAYS`.

## 6. `reports` (F7)

Reportes sobre los datos del tenant, calculados en segundo plano y guardados como resultado.

### 6.1 Contrato `@contracts/reports`

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

| Ruta (`ReportsRoute`)  | Método y path                           | Acceso                                                                             | Pantalla (microfrontend `reports`)             |
| ---------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| `reports.catalog.list` | `GET /v1/reports`                       | `reports:read`, flag `NewReports`                                                  | Catálogo y formulario de parámetros            |
| `reports.run.create`   | `POST /v1/reports/runs`                 | `reports:write`, flag `NewReports` (CSV exige la funcionalidad `advanced_reports`) | Botón "Generar" (202 con `runId`)              |
| `reports.run.list`     | `GET /v1/reports/runs`                  | `reports:read`, flag `NewReports`                                                  | Lista de ejecuciones                           |
| `reports.run.get`      | `GET /v1/reports/runs/{runId}`          | `reports:read`, flag `NewReports`                                                  | Detalle y resultado (`columns`, `rows`)        |
| `reports.run.download` | `GET /v1/reports/runs/{runId}/download` | `reports:read`, flag `NewReports`                                                  | Descarga: `{ fileName, contentType, content }` |

El parámetro de una ejecución es `{ from, to, granularity }` con `CalendarDateSchema`. La exigencia de `advanced_reports` en CSV la aplica el caso de uso con `PLATFORM.ACCESS.FEATURE_NOT_INCLUDED`, porque depende del cuerpo y no de la ruta.

| Elemento    | Detalle                                                                                                                                                                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Errores     | `REPORTS.RUN.NOT_FOUND` (404), `REPORTS.RUN.NOT_READY` (409), `REPORTS.RUN.EXPIRED` (410), `REPORTS.TYPE.UNKNOWN` (400), `REPORTS.PARAMS.INVALID_RANGE` (400), `REPORTS.RESULT.TOO_LARGE` (422).                                                                                                                                |
| Eventos     | Tópico `reports-events`: `reports.run.completed.v1` (tenant, tipo, estado, `requestedBy` como `UserRef`).                                                                                                                                                                                                                       |
| Comandos    | `reports.run.execute.v1` en la cola `reports-runs`: el caso de uso lo envía a sí mismo por el outbox, así la ejecución sale de la petición y la retoma un worker.                                                                                                                                                               |
| Operaciones | `reports.user-data.erase.v1` (sin compensación, posterior al pivote: borra `requestedBy` de las ejecuciones y las proyecciones con usuario) y las cuatro de traslado.                                                                                                                                                           |
| Colas       | `reports-runs`; `reports-projections` (suscrita a `tasks-events`: las tres) y `reports-finance-projections` (suscrita a `billing-events`: `invoice.issued`, `invoice.paid`, `invoice.failed`, y a `notifications-events`: `notification.created`). Esta última entra al contrato en la ola 5 y su consumidor llega en la ola 7. |

### 6.2 Módulos

| Módulo        | Responsabilidad                                                                                                                                | Tablas (shard de tenant)                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `catalog`     | `ReportDefinition` (clase por tipo: parámetros, columnas, `compute`), `ReportRegistry`                                                         | Ninguna                                                                            |
| `runs`        | Agregado `ReportRun`, casos de uso de las rutas, ejecución del comando, `ReportsJob.ExpireRuns` (diario, exclusivo, borra resultados vencidos) | `report_runs` (auditada): estado, parámetros, `result jsonb`, tamaño, `expires_at` |
| `projections` | Consumidores que mantienen las proyecciones y `ReportsJob.BackfillProjections` (relleno por `tasks.tasks.list-changes.v1`, una vez por tenant) | `proj_tasks`, `proj_invoices`, `proj_deliveries`                                   |

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

`ReportDefinition.compute` solo lee proyecciones por `ProjectionsFacade`, nunca otro servicio ni otra base. El tamaño máximo del resultado es `REPORTS_MAX_RESULT_BYTES`; el resultado vive en la fila y vence a los `REPORTS_RESULT_TTL_DAYS` (decisión 7).

## 7. `billing` (F8)

Calcula qué debe pagar cada tenant y lleva el estado de cada factura. El cobro es un proceso aparte detrás del puerto `PaymentProvider`.

### 7.1 Contrato `@contracts/billing`

Importa `PlanFeature` de `@contracts/identity`; el general agrega la regla de límites `contracts-billing` a `contracts-identity` en `backend/eslint.config.mjs`.

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
// UsageAggregation (constants/): Users y StorageGb = máximo del periodo; ApiCalls = suma
```

Los esquemas calcan los tipos del front: `Plan` (`id`, `name`, `price: MoneyAmount`, `periodicity`, `quotas: { metric, limit }[]`, `features`), `Subscription` (`id`, `plan`, `status`, `period: { start, end }` con `CalendarDateSchema`), `QuotaUsage` (`metric`, `limit`, `used`), `Invoice` (`id`, `number`, `period`, `status`, `currency`, `lines`, `total`) con `InvoiceLine` (`kind`, `description`, `amount`).

| Ruta (`BillingRoute`)              | Método y path                          | Acceso          | Pantalla que la usa                                  |
| ---------------------------------- | -------------------------------------- | --------------- | ---------------------------------------------------- |
| `billing.subscription.get`         | `GET /v1/billing/subscription`         | `billing:read`  | `BillingPlanController` (`currentSubscription`)      |
| `billing.usage.get`                | `GET /v1/billing/usage`                | `billing:read`  | `BillingPlanController` (`currentUsage`) y medidores |
| `billing.plan.list`                | `GET /v1/billing/plans`                | `billing:read`  | `ChangePlanController` (`availablePlans`)            |
| `billing.subscription.change-plan` | `PUT /v1/billing/subscription/plan`    | `billing:write` | `ChangePlanController.changePlan`                    |
| `billing.invoice.list`             | `GET /v1/billing/invoices`             | `billing:read`  | `InvoicesController` (páginas, más nuevas primero)   |
| `billing.invoice.get`              | `GET /v1/billing/invoices/{invoiceId}` | `billing:read`  | `InvoiceDetailController`                            |

| Elemento    | Detalle                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Errores     | `BILLING.SUBSCRIPTION.NOT_FOUND` (404), `BILLING.SUBSCRIPTION.NOT_CHANGEABLE` (409, suspendida o cancelada), `BILLING.PLAN.NOT_AVAILABLE` (404), `BILLING.PLAN.USAGE_EXCEEDS_LIMIT` (409, bajar de plan con uso mayor al nuevo límite), `BILLING.INVOICE.NOT_FOUND` (404), `BILLING.INVOICE.INVALID_STATE` (409), `BILLING.QUOTA.EXCEEDED` (403, con `metric`, `limit` y `used` en `details`).                        |
| Eventos     | Tópico `billing-events`: `billing.subscription.changed.v1`, `billing.subscription.suspended.v1`, `billing.subscription.reactivated.v1`, `billing.entitlements.changed.v1`, `billing.invoice.issued.v1`, `billing.invoice.paid.v1`, `billing.invoice.failed.v1`.                                                                                                                                                       |
| Comandos    | `billing.usage.record.v1` en la cola FIFO `billing-usage`: lote `{ tenantId, records: [{ metric, quantity, windowStart, key }] }`. Cada servicio que mide lo declara en `sends`.                                                                                                                                                                                                                                      |
| Operaciones | `billing.accounts.open.v1` (compensa `billing.accounts.close.v1`, que sin factura emitida borra la suscripción y no tiene compensación propia: solo corre como compensación), `billing.entitlements.get.v1` y `billing.quotas.check.v1` (lecturas), `billing.invoices.mark-paid.v1` y `billing.invoices.mark-failed.v1` (sin compensación: el pago ocurrió fuera; se corrige con una nota), y las cuatro de traslado. |
| Colas       | `billing-usage` (el comando) y `billing-identity` (suscrita a `identity-events`: `membership.changed`, para el conteo de usuarios).                                                                                                                                                                                                                                                                                   |

### 7.2 Módulos

| Módulo          | Responsabilidad                                                                                                                                                                                     | Shard                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `plans`         | Catálogo versionado (`billing_plans`, `billing_plan_quotas`), semilla con `nx run billing:seed`                                                                                                     | Catálogo                 |
| `subscriptions` | Agregado `Subscription`, cambio de plan con prorrateo (`ProrationCalculator`, enteros, redondeo al alza), ciclo de morosidad y prueba. Jobs `BillingJob.AdvanceDunning` y `BillingJob.ExpireTrials` | Tenant (`subscriptions`) |
| `usage`         | Ingesta idempotente del comando (`usage_records`, único por tenant y `key`), agregados por periodo (`usage_totals`) y conteo de usuarios por `membership.changed`                                   | Tenant                   |
| `entitlements`  | `EntitlementsSnapshot` (funcionalidades y cuotas del plan vigente), operaciones `get` y `check`, evento `entitlements.changed`                                                                      | Ninguna propia           |
| `invoices`      | `Invoice` y líneas, numeración consecutiva por tenant (`invoice_sequences`), `BillingJob.CloseInvoicePeriods` (diario, exclusivo)                                                                   | Tenant                   |
| `payments`      | Puerto `PaymentProvider` (`FakePaymentProvider`), `payment_attempts`, operaciones `mark-paid` y `mark-failed`                                                                                       | Tenant                   |

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

- **Morosidad.** `invoice.failed` lleva la suscripción a `PastDue`; pasados `BILLING_GRACE_DAYS` el job la pasa a `Suspended` y publica `billing.subscription.suspended.v1`; identity lo consume en `identity-billing` y llama `identity.tenants.suspend.v1`. Un pago posterior la reactiva con `subscription.reactivated.v1`.
- **Entitlements.** Cualquier cambio de plan o de estado publica `billing.entitlements.changed.v1`; identity sube la versión de permisos del tenant (`auth:pv:tenant`) y el siguiente token trae `features` nuevas.
- **Facturas.** `CloseInvoicePeriods` cierra los periodos vencidos: arma las líneas de cargo fijo y de uso (solo métricas con precio unitario en el plan, decisión 11), emite la factura, publica `invoice.issued` y pide el cobro a `PaymentProvider`. Todo en enteros de la unidad mínima con su moneda.
- **Cuotas.** `Users` se comprueba en identity al agregar un miembro (`BillingQuotaChecker`); `ApiCalls` con `@Quota(UsageMetric.ApiCalls)` en las rutas de integración. El valor de `check` puede estar atrasado hasta 10 s.

Configuración: `BILLING_TRIAL_DAYS`, `BILLING_GRACE_DAYS`, `BILLING_INVOICE_SERIES`, `BILLING_PAYMENT_PROVIDER` (`fake`). Los números de factura son internos; la factura electrónica ante la DIAN queda fuera.

## 8. Lo que cruza servicios (ola 7)

### 8.1 Sagas de ejemplo

Las orquesta identity con `SagaModule.forFeature` ([persistencia y sagas, sección 5](persistencia-typeorm-y-sagas.md#5-sagas)); cada paso es una operación de un contrato, y su reversa sale del `compensatedBy`.

**`TenantOnboarding`** (`modules/tenants`). `POST /v1/tenants` crea el tenant en `Provisioning` y arranca la saga en la misma transacción. Sustituye al `CreateTenant` directo de F4.

| Paso   | Operación                                    | Compensación                  | Fase             |
| ------ | -------------------------------------------- | ----------------------------- | ---------------- |
| 1      | `identity.tenants.create.v1`                 | `identity.tenants.discard.v1` | Antes del pivote |
| 2      | `billing.accounts.open.v1`                   | `billing.accounts.close.v1`   | Antes del pivote |
| pivote |                                              |                               |                  |
| 3      | `identity.tenants.activate.v1`               | Ninguna (idempotente)         | Después          |
| 4      | `notifications.users.notify.v1` (bienvenida) | Ninguna (idempotente)         | Después          |

Mientras corre, el tenant está en `Provisioning` y nadie lo usa. Si `billing` rechaza el paso 2, se descarta el tenant y el creador recibe `GET /v1/sagas/{sagaId}` en `compensated`.

**`DeleteAccount`** (`modules/users`, `POST /v1/me/deletion` con step-up). Habeas data: el único paso reversible va primero.

| Paso   | Operación                                                                                                                         | Compensación                   | Fase             |
| ------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------------- |
| 1      | `identity.users.suspend.v1`                                                                                                       | `identity.users.reactivate.v1` | Antes del pivote |
| pivote |                                                                                                                                   |                                |                  |
| 2      | `tasks.user-data.erase.v1`                                                                                                        | Ninguna (idempotente)          | Después          |
| 3      | `notifications.user-data.erase.v1`                                                                                                | Ninguna (idempotente)          | Después          |
| 4      | `reports.user-data.erase.v1`                                                                                                      | Ninguna (idempotente)          | Después          |
| 5      | `identity.users.erase.v1` (estado `Deleted`, borra credenciales, sesiones, dispositivos, passkeys y la fila de `identity_lookup`) | Ninguna                        | Después          |

Un `BusinessError` después del pivote deja la saga en `RequiresIntervention` (backoffice). La saga publica `identity.user.erased.v1` al terminar. `billing` no borra nada del usuario: las facturas son del tenant y se conservan.

**`MoveTenant`** se describe en la sección 8.4.

### 8.2 Cómo `reports` agrega datos

1. Los consumidores de `reports-projections` escriben una fila por tarea en `proj_tasks` (estado, creación, cierre, borrado) con el mismo id del evento como llave de idempotencia. Los de `reports-finance-projections` escriben `proj_invoices` y `proj_deliveries`.
2. Un tenant que existía antes del servicio no tiene historia. `BackfillProjections` pagina `tasks.tasks.list-changes.v1` por tenant y marca el tenant como rellenado; los eventos nuevos y el relleno se mezclan sin duplicar porque la llave es el `taskId` y `version`.
3. `compute` agrega con SQL sobre las proyecciones del propio shard del tenant. No hay consulta entre shards en un reporte de tenant. `AcrossShards` queda para jobs de mantenimiento propios.
4. La ola 6 entrega `TasksByStatus` y `TasksActivity` con proyecciones de tareas. La ola 7 suma `InvoicesSummary` y `NotificationsDelivery`, y el relleno de facturas.

### 8.3 Medición hacia `billing`

| Métrica     | Fuente                                                                                                                                                                    | Llave de idempotencia                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `ApiCalls`  | `ApiCallMeteringInterceptor` cuenta las peticiones de actores `ServiceAccountActor` en un contador de Valkey por tenant y minuto; `UsageFlushJob` envía el lote cada 60 s | `<servicio>:<tenant>:api_calls:<ventana>` |
| `Users`     | `billing` consume `identity.membership.changed.v1` y mantiene el conteo de miembros activos                                                                               | `membership.changed` (id del mensaje)     |
| `StorageGb` | Sin fuente: no hay servicio de archivos (decisión 12)                                                                                                                     | No aplica                                 |

`UsageFlushJob` corre por tenant dentro de `ShardScope.run` y `runInTransaction`, porque el outbox exige transacción. Un reinicio pierde a lo sumo la ventana en memoria del proceso, no los contadores de Valkey. Cada servicio suma `MeteringModule` a su `app.module.ts` (una línea que integra el general) y declara `sends` en su contrato desde la ola 5.

### 8.4 Varias regiones y `MoveTenant` (F10)

**Regiones.** Una variable `REGIONS` (JSON: `code`, `apiBaseUrl`, `issuer`) y `SERVICE_REGION` identifican la región de cada despliegue. El catálogo vive en la región principal. Cada servicio rechaza al tenant de otra región con `PLATFORM.SHARDING.WRONG_REGION` (421) y `details.apiBaseUrl`; el SDK del front (`packages/api`) reintenta una vez contra esa URL. `sign-in` devuelve `region` y `apiBaseUrl`, y los tokens de una región no verifican en la otra porque el `iss` cambia. Cada región tiene su propio Valkey, colas y shards.

**Local.** Un segundo Postgres (`postgres-b`) y un segundo Valkey (`valkey-b`) en el compose simulan la región B; cada servicio corre dos veces con `SERVICE_REGION`. El general edita el compose y `init.sql`.

**Mover datos.** `@platform/tenant-move` define lo que cada servicio declara y la copia genérica:

```ts
export interface TenantMoveTable {
  readonly table: string;
  /** Cómo se llega a las filas del tenant: columna propia o a través de una tabla padre. */
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
  abstract tables(): readonly TenantMoveTable[]; // en orden de dependencia
}
export abstract class TenantDataTransfer {
  abstract sync(move: MoveRef): Promise<TransferProgress>;
  abstract verify(move: MoveRef): Promise<TransferVerification>;
  abstract abort(move: MoveRef): Promise<void>;
  abstract cleanup(move: MoveRef): Promise<void>;
}
```

`BatchTenantDataTransfer` copia por lotes con cursor por `id` (UUIDv7, ordenado por creación) y repite rondas delta con `updated_at` hasta que el atraso baja de un umbral; el borrado lógico hace visibles los borrados. Verifica conteos y suma de `md5` por tabla. El servicio origen se conecta a los shards destino con `TENANT_MOVE_TARGETS` (credenciales solo de escritura en esas bases). Las operaciones `<servicio>.tenant-move.{sync,finalize,abort,cleanup}.v1` de `defineTenantMoveOperations` las registra `TenantMoveModule.forFeature({ service, manifest })`.

**Compuerta de escritura.** Con el tenant en `Migrating` el resolver de persistencia espera hasta `TENANT_MOVE_MAX_WAIT_MS` a que vuelva a `Active` y, si no, responde `PLATFORM.SHARDING.TENANT_MIGRATING` (503 con `Retry-After`). Reemplaza al candado en Valkey de la arquitectura, que no cruza el prefijo de cada servicio.

| Paso | Qué hace                                                                                               | Compensación                   | Fase    |
| ---- | ------------------------------------------------------------------------------------------------------ | ------------------------------ | ------- |
| 1    | `BeginMove`: valida destino, registra `tenant_moves` en el catálogo                                    | `AbortMove`                    | Antes   |
| 2-6  | `<servicio>.tenant-move.sync` en identity, tasks, notifications, reports y billing (escrituras siguen) | `<servicio>.tenant-move.abort` | Antes   |
| 7    | `FreezeTenant`: placement en `Migrating`                                                               | `UnfreezeTenant` (`Active`)    | Antes   |
| 8-12 | `<servicio>.tenant-move.finalize` (última ronda, verificación, `identity_lookup.region` en identity)   | `<servicio>.tenant-move.abort` | Antes   |
| 13   | `SwitchDirectory`: nuevo grupo y región, `Active`, versión + 1, evento `ShardDirectoryChanged`         | Pivote                         | Pivote  |
| 14   | `FinishMove`: marca `tenant_moves` como `Switched`                                                     | Ninguna (idempotente)          | Después |

`TenantMoveCleanupJob` (identity, diario, exclusivo) llama `cleanup` en cada servicio cuando pasa `TENANT_MOVE_GRACE_DAYS` desde el corte. Un tenant `SharedCustomers` o `Platform` no se mueve (`IDENTITY.TENANT_MOVE.NOT_MOVABLE`). Se lanza con `nx run identity:tenant-move -- --tenant=<id> --target=<región>`, auditado con el commit, no por HTTP. El tenant mueve los usuarios cuyo `homeTenantId` es él (la tabla `users` declara `home_tenant_id` en su manifiesto y las demás tablas de usuario se enlazan con `via-parent`).

### 8.5 Generadores (F11)

Parten de lo ya construido: `tasks` es la referencia de un servicio mínimo completo y `plans` o `inbox` de un módulo.

| Generador                                              | Crea                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nx run generators:service -- --name=<n>`              | `backend/apps/<n>/` con el esqueleto de la sección 3.1 (`project.json` con tags, `tsconfig*`, `jest.config.cjs`, `eslint.config.mjs`, `src/*.ts`, `config`, `database`, `messaging`, `shared`), `backend/libs/contracts/<n>/` con sus carpetas, el tfvars de `environments/*/services/<n>/` y un módulo `health`. Imprime las líneas de archivos compartidos (alias de `tsconfig.base.json`, `init.sql`, `.env.example`, regla de límites). |
| `nx run generators:module -- --service=<n> --name=<m>` | `modules/<m>/{index.ts,domain,application/<m>.facade.ts,infrastructure/persistence/{entities,mappers,migrations},presentation/<m>.module.ts,__tests__/utils/fake-<m>.facade.ts}`, un bloque de migraciones en `migration-ranges.constants.ts` y la línea en `app.module.ts` y en `database/*-migrations.ts` (marcadores `// generated:modules`).                                                                                            |

Los generadores son clases con plantillas de texto y sustitución de `__name__`, `__Name__` y `__NAME__`, sin librería (decisión 18). `generators:verify` regenera el esqueleto de `tasks` con su nombre y compara byte a byte los archivos que no son de dominio (los de arranque, configuración y `project.json`): una plantilla que se aparta del servicio real rompe CI. `contracts-export` suma un target `openapi` que escribe `export/openapi.json` (OpenAPI 3.1) desde `contract.json`, sin `@nestjs/swagger` (decisión 4 de F4). El ciclo de la ola 9 también actualiza ARCHITECTURE, los ADR y la skill `backend-estructura`, y quita de `CLAUDE.md` la frase "llegan en la fase F11".

## 9. Pantallas (F9)

Cada microfrontend cambia `RepositoryBinding.demoOnly` por un binding con `demo` y `live`, y agrega un `Api<Nombre>Repository` sobre `ApiClient` y las rutas generadas (`TasksRoutes`, `NotificationsRoutes`, `BillingRoutes`, `ReportsRoutes`), que valida la petición contra el contrato antes de llamar. Los fakes se conservan para el modo demo y las pruebas. Las pruebas usan `test_utils` con un transporte falso; no necesitan backend.

| Microfrontend                                    | Repositorio real                                                                                                                                                             | Particularidades                                                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tasks`                                          | `ApiTasksRepository`: `list` y `search` salen de `GET /v1/tasks`; el `TaskNotFoundException` sale de `TASKS.TASK.NOT_FOUND`; `changes()` se emite tras cada escritura propia | La búsqueda pasa a paginarse con `after`                                                                                                          |
| `notifications`                                  | `ApiNotificationsRepository` y `SseNotificationsStream` (lee `GET /v1/notifications/stream` con `package:http` y el token de `packages/auth`, reanuda con `Last-Event-ID`)   | `live()` y `watchUnreadCount()` salen del stream; sin conexión caen a consultar el conteo. Agrega `timezone` al guardar preferencias              |
| `billing`                                        | `ApiBillingRepository`; `BILLING.QUOTA.EXCEEDED` y `BILLING.PLAN.USAGE_EXCEEDS_LIMIT` se muestran en `ChangePlanController`                                                  | Los enums `Currency`, `QuotaKey` y los estados se reemplazan por los generados; `invoice(id)` devuelve null ante `BILLING.INVOICE.NOT_FOUND`      |
| `reports` (nuevo)                                | Generado con `dart run front/tools/new_microfrontend.dart reports --menu "Reportes"`; `ApiReportsRepository`                                                                 | Pantallas: catálogo con parámetros, lista de ejecuciones (con sondeo mientras `Queued` o `Running`) y detalle con descarga. Acceso `reports:read` |
| `backoffice`, `assistant`, `verifier`, `account` | Sin cambios en estas fases                                                                                                                                                   | `verifier` y `account` dependen de F4; `backoffice` y `assistant` esperan al `backoffice-api` y al módulo de IA                                   |

Cada código de error nuevo con audiencia pública tiene su texto es y en en `front/packages/i18n` (lo entrega la tropa 2 de la ola 5). Las claves de etiquetas de cada microfrontend siguen en su propio ARB.

## 10. Despliegue por servicio (F12, solo lo que toca a estos servicios)

Un servicio es desplegable cuando cumple el contrato con el pipeline que escribe la tropa 3 de la ola 5, sin leer su código. Cada servicio trae `main.ts` y `lambda.ts`, y la tabla muestra el runtime por defecto de la plantilla; cambiarlo es una línea de tfvars:

1. `backend/apps/<servicio>/project.json` con tag `type:app` y los targets `build` (`app-bundler`, salida en `backend/dist/<servicio>`), `migrate` y `seed`.
2. `backend/infra/terraform/environments/<ambiente>/services/<servicio>/{terraform.tfvars,backend.tfvars}`. El pipeline recorre esa carpeta: no hay lista de servicios escrita en el workflow.
3. Orden por servicio: `migrate`, `apply` del stack `service` y publicación de la imagen.

| Servicio        | `api.runtime` | `route_prefixes`                                    | Partes extra                                                                                                          |
| --------------- | ------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `tasks`         | `fargate`     | `/v1/tasks`                                         | Worker para el outbox y los jobs                                                                                      |
| `notifications` | `fargate`     | `/v1/notifications`, `/v1/notification-preferences` | `realtime` (ALB público, ruta `/v1/notifications/stream`), workers `triggers` y `realtime-control`, `ses_send = true` |
| `reports`       | `fargate`     | `/v1/reports`                                       | Workers `runs` y `projections`                                                                                        |
| `billing`       | `fargate`     | `/v1/billing`                                       | Workers `usage` e `identity`                                                                                          |

Las tropas 4 y 5 escriben los tfvars de `dev`, `staging` y `prod` de sus servicios; la prioridad única de `listener_rule_priority` de cada API en Fargate y las bases `<servicio>_shard_<n>` de `environments/*/data/terraform.tfvars` las asigna el general. `topology.json` lo regenera `contracts-export` en la ola 5 (colas, tópicos y `producers`). El rol de cada servicio no pide `files_access`.

## 11. Paquetes de trabajo

En la ola 5 cada tropa es un guía Sonnet y dos Haiku (la de `@platform/http` e identity suma un capitán Opus); desde la ola 6 cada ola es un ciclo con un constructor y un revisor Opus (11.2). Las rutas son relativas a la raíz del repositorio. Lo que el general integra en cada ola: `nx.json`, `backend/tsconfig.base.json` (alias), `backend/eslint.config.mjs`, `backend/docker-compose.yml`, `backend/infra/local/**`, `backend/.env.example`, `front/pubspec.yaml`, `front/apps/*/lib/main.dart`, `environments/*/data/terraform.tfvars`, los `app.module.ts` que varias tropas tocan en la ola 7 y `docs/plan/**`. Cada tropa lista en su informe las líneas que pide al general.

### 11.1 Ola 5

| Tropa             | Carpetas exclusivas                                                                                                                                                                                                                                                                                                                                                                  | Produce                                                                                                                                                                                                                            | Cierra                                                                                                                                                                                                                                                        | Depende de      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 2 (contratos)     | `backend/libs/contracts/{tasks,notifications,reports,billing}/**`; `backend/libs/contracts/identity/src/**` y `export/**` (solo el delta de 3.4); `backend/libs/contracts/platform/src/{kit,schemas,types,enums,errors}/**`; `backend/libs/contracts/asyncapi.json`; `backend/infra/terraform/topology.json`; `front/packages/contracts/lib/src/**`; ARB de `front/packages/i18n/**` | Secciones 3.3, 3.4, 4.1, 5.1, 6.1 y 7.1 completas con su Dart, `topology.json`, `asyncapi.json` y los textos es y en de cada código público. Haiku 1: tasks y notifications. Haiku 2: reports y billing. Guía: platform e identity | `contract.spec.ts` de cada servicio (ids únicos, compensaciones existentes, códigos con catálogo, esquemas JSON-safe); `pnpm nx run contracts-export:check`; `dart run contracts_gen --check`; prueba ARB                                                     | Ola 4 integrada |
| 3 (pipeline, F12) | `.github/workflows/{deploy,publish-web,publish-mobile}.yml`; `backend/infra/scripts/**`; `backend/infra/terraform/modules/oidc*/**`; el módulo de OIDC dentro de `stacks/platform`; `backend/libs/platform/service/src/lambda/**`; `backend/libs/platform/internal-api/src/signing/**`; `backend/libs/platform/adapters/aws/src/sigv4/**`                                            | Despliegue con OIDC hacia AWS, por servicio, según la sección 10; publicación de la web y la app móvil; `bootstrapLambda` y `SigV4Signer` (tabla 2.1)                                                                              | `terraform test` y `tf-validate` en verde; un servicio de prueba (fixture) recorre migrar, aplicar y publicar en Fargate y en Lambda; la prueba de contrato de `InternalRequestSigner` pasa con los dos firmantes; sin claves de larga vida en el repositorio | Ninguna         |

La tropa 1 de la ola 5 (WP2 y WP6 de F4) no toca nada de lo anterior. Si el esqueleto de identity (WP6) necesita los permisos nuevos, el general los agrega al integrar.

### 11.2 Olas 6 a 9: ciclos de construcción y revisión

Desde la ola 6, cada ola es un ciclo con dos agentes Opus: un constructor que planea, implementa y prueba, y un revisor independiente que lee el diff completo, corre la verificación y devuelve hallazgos sin editar. El constructor corrige y el revisor vuelve a revisar, hasta dos rondas (flujo `ciclo-fase`). Después el general integra, verifica, abre el PR y lo mezcla con los checks en verde, y arranca el ciclo siguiente sin esperar al usuario. El usuario revisa todo al final; sus correcciones corren como un ciclo más con el mismo flujo.

Las fases se juntan por dependencia: cada servicio trae su stack de Terraform, cada librería de plataforma nace en el ciclo que la usa y WP15 de F4 entra con identity.

| Ola | Fases         | Qué construye                                                                                                                                                                                                                                | Cierra                                                                                                                                                             |
| --- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 6   | F4            | WP7 a WP14 sobre las fachadas y fakes de WP6, y WP15 (e2e y matriz de acceso de identity)                                                                                                                                                    | Fichas de WP7 a WP15 del diseño de F4                                                                                                                              |
| 7   | F5 y F6       | Servicios `tasks` y `notifications` con sus tfvars; `@platform/flags`, `@platform/search` con sus dos modos, `features` y `flags` en `auth` y `http`; `@platform/realtime` con SSE y Socket.IO, `apps/realtime` y SES (secciones 3.5, 4 y 5) | Integración sobre dos shards; Mailpit recibe un correo; prueba de contrato de cada puerto con todos sus adaptadores; reconexión sin pérdida en los dos transportes |
| 8   | F7 y F8       | Servicios `reports` y `billing` con sus tfvars; `@platform/quotas` y `@platform/metering`; sagas `TenantOnboarding` y `DeleteAccount`; medición y proyecciones entre servicios (secciones 6, 7, 8.1 a 8.3)                                   | Cada saga con `CrashingSagaStore`; flujo de alta de tenant, cambio de plan, factura, morosidad y reactivación                                                      |
| 9   | F9, F10 y F11 | Pantallas de negocio y escenarios de las apps (sección 9); regiones, sharding real y `MoveTenant` con sus dos estrategias y sus dos compuertas (8.4); generadores, OpenAPI, ARCHITECTURE, ADR y runbooks (8.5); el mapa visual final         | Checks del front; traslado entre grupos y regiones sin pérdida; un servicio y un módulo generados pasan `lint test typecheck build`                                |

## 12. Pruebas y criterio de terminado

- **Unitarias.** Con los fakes de cada fachada y puerto, reloj e `IdGenerator` deterministas. Dominio sin Nest ni TypeORM.
- **Integración** (`pgvector/pgvector:0.8.7-pg17` y `valkey/valkey-bundle:8.1.11`, como en [F4, sección 8](f4-identity.md#8-pruebas-y-criterio-de-terminado)). Cada módulo prueba sus filas en el shard que calcula el router, con al menos un usuario o tenant en cada uno de los dos shards. Se saltan sin Docker.
- **E2E por ruta**, con la app completa, Postgres y Valkey reales y el bus en memoria; un e2e de autorización por servicio con la matriz de acceso (sin token, sin permiso, sin funcionalidad, con flag apagado y con step-up vencido donde aplique).
- **Sagas.** Cada una con `CrashingSagaStore` y compensación declarada por operación, y la regla "pasos antes del pivote con compensación, después idempotentes".
- **Front.** `analyze`, `format-check`, `test`, `check_microfrontend_boundaries` y `check_deferred_chunks`.
- **Un paquete está terminado** con `pnpm nx affected -t lint test typecheck build`, cobertura de 80 % (líneas, sentencias y funciones) y 75 % (ramas) por proyecto, `contracts-export:check` y `dart run contracts_gen --check` cuando toca contratos, sin literales de eventos, permisos, códigos, colas o jobs, sin secretos y sin dependencias fuera de la sección 13.
- **F5 a F11 terminan** cuando la ola 7 pasa el flujo de punta a punta dos veces seguidas y ARCHITECTURE y los ADR 0008, 0010, 0011, 0013 y 0014 reflejan lo construido.

## 13. Dependencias externas

| Necesidad                   | Decisión                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correo en AWS               | Librería: `@aws-sdk/client-sesv2`, aislada en `SesEmailSender`. Implementar el protocolo firmado de SES (SigV4) a mano sería imprudente.                                                    |
| Correo local (Mailpit)      | Propio: `SmtpEmailSender` sobre `node:net`, sin autenticación ni TLS, solo con `NODE_ENV=development`. Se descarta `nodemailer`.                                                            |
| Plantillas de correo        | Propias: clases con cadenas y `escapeHtml`. Se descartan React Email y MJML.                                                                                                                |
| Feature flags               | Propio: `@platform/flags`. Se descarta OpenFeature.                                                                                                                                         |
| Tiempo real                 | SSE propio sobre `text/event-stream` y Valkey Stream. Socket.IO con su librería y el adaptador de streams, porque reimplementar su protocolo es imprudente.                                 |
| Push real                   | Fuera de F6 (puertos y fakes). Web Push exige cifrado de carga útil (RFC 8291): cuando llegue, `web-push` es una candidata razonable.                                                       |
| CSV y JSON de reportes      | Propio: escritor CSV con comillas y escape.                                                                                                                                                 |
| Copia de datos entre shards | Propio: lotes con TypeORM (`BatchCopyTransfer`) y replicación lógica con publicaciones y suscripciones de PostgreSQL por SQL (`LogicalReplicationTransfer`). Se descarta `pg-copy-streams`. |
| Generadores y OpenAPI       | Propio: plantillas de texto y un exportador a OpenAPI 3.1. Se descartan `@nx/devkit` y `@nestjs/swagger`.                                                                                   |
| Cron y jobs                 | Ya existen (`@platform/scheduling`).                                                                                                                                                        |

| Paquete                            | Versión exacta | Publicada  | Dónde                             | Por qué no se implementa en casa                                                                                                                    | Alternativa descartada                                                                     |
| ---------------------------------- | -------------- | ---------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@aws-sdk/client-sesv2`            | `3.1160.0`     | 2026-10-29 | `libs/platform/adapters/aws`      | Firmar y llamar la API de SES con SigV4 y reintentos es criptografía y protocolo ajenos al producto. Misma versión que `client-sns` y `client-sqs`. | `fetch` con una firma SigV4 propia: más código y más riesgo que el cliente.                |
| `socket.io`                        | `4.8.4`        | 2026-09-25 | `libs/platform/realtime`          | Protocolo con transporte, reconexión y recuperación de estado; reimplementarlo es imprudente.                                                       | WebSocket propio sobre `node:http`: otro protocolo que mantener y sin clientes existentes. |
| `@socket.io/redis-streams-adapter` | `0.3.1`        | 2026-03-12 | `libs/platform/realtime`          | Reparte mensajes entre instancias y da connection state recovery sobre un stream, como pide el ADR 0011. Se prueba con `iovalkey`.                  | `@socket.io/redis-adapter`: Pub/Sub sin recuperación de estado.                            |
| `@nestjs/websockets`               | `12.3.2`       | 2026-10-27 | `libs/platform/realtime/src/nest` | Gateway de NestJS, misma versión que el resto de NestJS.                                                                                            | Servidor de Socket.IO montado a mano fuera de NestJS.                                      |
| `@nestjs/platform-socket.io`       | `12.3.2`       | 2026-10-27 | `libs/platform/realtime/src/nest` | Adaptador de NestJS para Socket.IO.                                                                                                                 | La misma.                                                                                  |

Las fechas se comprobaron con `npm view` el 16 de noviembre de 2026: todas tienen más de dos semanas. Se fijan exactas, sin `^` ni `~`. SES y las de tiempo real las agrega el ciclo de la ola 7 a `backend/package.json`; el general integra el lockfile.

## 14. Fuera de F5 a F11

| Pieza                                                                                                 | Cómo se simula o se pospone                                                  | Fase           |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------- |
| Servicio `files`, adjuntos y `StorageGb`                                                              | Sin fuente de `StorageGb`; los reportes guardan el resultado en la fila      | Posterior      |
| Webhooks salientes                                                                                    | Nada                                                                         | Posterior      |
| Adaptador real de `EmbeddingProvider`, módulo de IA y `assistant`                                     | Fake determinista de embeddings; `assistant` sigue con datos de demostración | Posterior      |
| Push real (APNs, FCM, Web Push)                                                                       | `InMemoryPushSender`                                                         | Posterior      |
| Eventos de rebote y queja de SES, píxel de apertura                                                   | Solo la tabla `email_suppressions` y el puerto                               | Posterior      |
| `backoffice-api`, pantallas nuevas de `backoffice`, reportes de plataforma                            | Los datos de `backoffice` siguen siendo de demostración                      | Posterior      |
| Cobro real, factura electrónica ante la DIAN                                                          | `FakePaymentProvider` y numeración interna                                   | Después de F12 |
| `agreements`, DPoP, exportación a data lake, SLOs, recuperación entre regiones, rebalanceo automático | Nada                                                                         | Después de F12 |

## 15. Decisiones que requieren al usuario

Cada decisión tiene opciones y una recomendación. El usuario aprobó todas las recomendaciones el 16 de noviembre de 2026.

1. **Qué entra en "capacidades" de F5.** (a) Feature flags propios y búsqueda de texto; archivos y webhooks fuera. (b) Sumar un servicio `files`. (c) Sumar webhooks salientes. **Recomiendo (a).** Los cuatro contratos de la ola 5 no incluyen `files`, F4 deja los flags para F5 y la pantalla de `tasks` pide búsqueda de texto. Los flags viven en la configuración de cada ambiente (`ConfigFlagStore`); una tabla editable en el catálogo necesita el `backoffice-api`, que no existe.
2. **Campos de la tarea y a quién se avisa.** (a) Solo título, descripción y estado, y se avisa a `createdBy` cuando otra persona la cambia. (b) Sumar responsable, fecha límite y prioridad. **Recomiendo (a).** Es lo que muestra la pantalla de hoy; `NotificationType.taskUpdated` necesita un destinatario y `createdBy` es el único que existe.
3. **Búsqueda por defecto.** La plantilla trae los dos modos de `SearchIndex` (tabla 2.1). (a) `SEARCH_MODE=text` por defecto, con `tsvector` en español. (b) `hybrid` por defecto. **Recomiendo (a).** El modo híbrido necesita un `EmbeddingProvider` real, que llega con el módulo de IA; hasta entonces corre con el fake en las pruebas.
4. **Tiempo real por defecto.** La plantilla trae SSE y Socket.IO, autenticación por access token y por cookie, y el módulo montable dentro de un servicio o en `apps/realtime` (tabla 2.1). (a) Por defecto, los dos transportes, montados dentro de `notifications` y con access token. (b) Por defecto, `apps/realtime` aparte, como dice el ADR 0011. **Recomiendo (a).** Ahorra un servicio desplegado en la configuración inicial; pasar a (b) es cambiar `REALTIME_HOST` y desplegar la app.
5. **Canales de F6.** (a) Email por SES en AWS y SMTP solo local, push solo con puertos y fakes, plantillas propias en TypeScript. (b) Además APNs, FCM y Web Push reales. (c) Plantillas con React Email o MJML. **Recomiendo (a).** Los canales reales de push piden cuentas de Apple y Firebase que solo el usuario tiene, y las plantillas propias evitan dos dependencias; (b) y (c) caben después sin tocar los puertos.
6. **Zona horaria del horario de silencio.** (a) Campo `timezone` en las preferencias, que el cliente llena la primera vez que guarda. (b) Fijar UTC. (c) Usar una zona por tenant. **Recomiendo (a).** El horario "22:00 a 07:00" sin zona no se puede aplicar; (c) exige un dato de tenant que identity no tiene.
7. **Reportes de la plantilla y exportación.** (a) `TasksByStatus`, `TasksActivity`, `InvoicesSummary` y `NotificationsDelivery`, en JSON y CSV, con el resultado guardado en la fila (hasta `REPORTS_MAX_RESULT_BYTES`) y vencimiento por `REPORTS_RESULT_TTL_DAYS`. (b) Resultados en S3. (c) Sumar PDF o XLSX. **Recomiendo (a).** Cada reporte sale de un servicio ya construido; (b) y (c) piden `files` y librerías de formato.
8. **CSV como funcionalidad de plan.** (a) La exportación CSV exige `PlanFeature.AdvancedReports`. (b) Todos los planes la tienen. **Recomiendo (a).** Ejercita entitlements de punta a punta con la ruta de ejemplo; la regla es una línea que se quita.
9. **Microfrontend `reports` nuevo en F9.** (a) Sí, generado con el script de P4.3. (b) No hay pantalla y `reports` se usa solo por API. **Recomiendo (a).** Sin pantalla, F7 no se ve y no hay forma de probar los permisos nuevos desde el front.
10. **Planes semilla, prueba y gracia.** (a) Sembrar Inicio, Pro y Empresa con los valores de demostración del front, editables en el catálogo, y exigir `BILLING_TRIAL_DAYS` y `BILLING_GRACE_DAYS` en la configuración (sin valor por defecto en el código; el entorno local usa 14 y 7). (b) Otros planes o precios. **Recomiendo (a).** Los precios son una decisión comercial y el repositorio no debe fijarla; el ciclo de morosidad del README no da cifras.
11. **Qué pasa al superar una cuota.** (a) Se bloquea con `BILLING.QUOTA.EXCEEDED` (como dice ARCHITECTURE) y las líneas de uso de la factura solo existen para métricas con precio unitario en el plan. (b) Se factura el excedente. **Recomiendo (a).** Es lo ya decidido; el medidor del front marca peligro al 100 % y los planes semilla no definen precio por unidad.
12. **Qué se mide y cómo.** (a) `ApiCalls` cuenta las peticiones de service accounts con API key; `Users` se calcula en `billing` por los eventos de membresía; `StorageGb` queda sin fuente. La medición viaja como comando `billing.usage.record.v1`, no como el evento `BillingEvent.UsageRecorded` de ARCHITECTURE. (b) Contar todas las peticiones. (c) Mantener el evento y permitir que otros servicios publiquen en el tópico de `billing`. **Recomiendo (a).** "Llamadas de API" es el uso de integración; el kit de contratos solo deja publicar un evento a su dueño, y el comando con `sends` es su forma de pedir trabajo a otro servicio.
13. **Roles de sistema.** La tabla de 3.3 (Owner todo; Admin sin `billing:write`; Member sin reportes de escritura ni billing; Billing solo billing y lectura de reportes). Alternativa: Admin con `billing:write`. **Recomiendo la tabla.** Cambiar un plan tiene costo, así que queda con Owner y Billing; es un cambio de una fila.
14. **`POST /v1/tenants` asíncrono.** (a) Responde 202 con `{ tenantId, sagaId }` y el cliente consulta `GET /v1/sagas/{sagaId}`. (b) Espera a que la saga termine y responde 201. **Recomiendo (a).** La saga cruza tres servicios y puede reintentar; el cliente de F4 no cambia de pantalla, solo de espera.
15. **Borrado de cuenta.** (a) Sin periodo de gracia: se suspende la cuenta y se borra en el acto; las tareas se conservan sin autor. (b) Gracia de N días con un job. **Recomiendo (a).** Es una saga de ejemplo; quien necesite gracia agrega un job que arranque la saga. Se confirma también que las facturas no se borran.
16. **Regiones de la plantilla.** (a) Dos regiones identificadas con los ids de AWS de Terraform (`us-east-1`, `sa-east-1`), con la segunda simulada en local por un segundo Postgres y Valkey. (b) Códigos de país (`co`, `us`) como el ejemplo de ARCHITECTURE. (c) Solo `dev` con dos regiones y `prod` con una. **Recomiendo (a).** El estado de Terraform ya se guarda por `<región>`, y los nombres no se traducen entre el catálogo y la infraestructura; las demos del backoffice (`euWest`, `usEast`, `saEast`) son datos de prueba. La ola 9 solo escribe el segundo `dev`; `staging` y `prod` los define el usuario.
17. **Traslado por defecto.** La plantilla trae `BatchCopyTransfer` y `LogicalReplicationTransfer`, y `DirectoryWriteGate` y `ValkeyWriteGate` (tabla 2.1). (a) Por defecto, copia por lotes y compuerta en el directorio. (b) Por defecto, replicación lógica y candado en Valkey, como dicen ARCHITECTURE y el ADR 0010. **Recomiendo (a).** La replicación lógica pide `wal_level=logical`, roles de replicación y red entre regiones, que no todo ambiente tiene; con (a) el traslado funciona en cualquier PostgreSQL. El ciclo de la ola 9 actualiza el ADR 0010 para nombrar las dos estrategias.
18. **Generadores y documentación.** (a) Clases propias con plantillas, expuestas como targets de Nx, y OpenAPI en JSON desde `contract.json`. (b) Generadores con `@nx/devkit` (`nx g`) y página de Scalar. **Recomiendo (a).** Cero dependencias nuevas; `nx run` basta para dos generadores y el portal de documentación sigue fuera del plan.
19. **Runtime por defecto y alcance de F9.** Cada servicio trae `main.ts` y `lambda.ts` (tabla 2.1). (a) Por defecto `fargate` en los cuatro servicios y F9 limitado a `tasks`, `notifications`, `billing` y `reports`; `backoffice` y `assistant` siguen en demostración hasta que existan sus APIs. (b) Algún servicio en `lambda` por defecto. (c) Incluir `backoffice` con un `backoffice-api` mínimo. **Recomiendo (a).** Los workers y el tiempo real necesitan procesos que viven; un servicio solo de API cambia a Lambda con una línea de tfvars.
