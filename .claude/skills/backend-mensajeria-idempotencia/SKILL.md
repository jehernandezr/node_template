---
name: backend-mensajeria-idempotencia
description: 'Outbox, consumidores SNS/SQS, idempotencia, versionado de eventos, DLQ y compensaciones de sagas. Úsala al publicar, consumir o definir una operación interna.'
paths:
  - 'backend/**/messaging/**'
  - 'backend/libs/platform/messaging/**'
  - 'backend/libs/platform/saga/**'
  - 'backend/libs/platform/internal-api/**'
  - 'backend/libs/contracts/**/events/**'
---

# Mensajería e idempotencia

ADR 0007 (mensajería tipada, CloudEvents), ADR 0008 (sagas), ADR 0023 (idempotencia con shards). Entrega al menos una vez: todo consumidor y toda operación que modifica datos tolera duplicados. Ejemplos de código y tabla de jobs en `references/ejemplos.md`.

## Publicar: outbox

- Se publica con `MessageBus.publish(event, data)` o `send(command, data)` dentro de `runInTransaction`. `OutboxMessageBus` guarda con `OutboxWriter.append` en esa transacción; sin transacción lanza `MessagingError` con `MessagingTransactionRequired`.
- `OutboxRelayJob` publica tras el commit y marca como enviado.
- Nunca se publica a SNS desde el caso de uso, antes del commit, ni en `afterCommit` sin outbox.
- Eventos con `pullDomainEvents()`, traducidos por un mapper de aplicación al contrato zod de `@contracts/<servicio>/events`.
- Tipo y cola de enums de la topología (`TopicDef`, `QueueDef`, `Route`).
- El outbox guarda `traceparent`, `tenantid` y `actorid`.

## Eventos como contrato

- CloudEvents 1.0 con tipo versionado: `identity.user.registered.v1`.
- Campo opcional nuevo: misma versión. Cambio incompatible: `v2` en paralelo hasta migrar a los consumidores, luego se retira `v1`.
- El consumidor ignora campos desconocidos. El productor nunca quita ni cambia el significado de un campo publicado.
- Sin datos personales innecesarios; solo el id si consultarlo es barato y seguro.
- Un cambio en `backend/libs/contracts` regenera el Dart del front en el mismo cambio.

## Consumir

- Clase de `presentation/` con un método `@Subscribe(Contrato)`. `MessagingExplorer` la registra en `MessageDispatcher`, que valida sobre y esquema; un mensaje inválido va a la DLQ sin reintento.
- La idempotencia la hace `MessageDispatcher` con un claim del `IdempotencyStore` (`ProcessedMessageStore`), llave `(consumidor, id del mensaje)`: `ClaimState.Acquired`, `InProgress` (se deja para reentrega) o `Completed` (se confirma sin ejecutar). `complete` corre en la transacción del manejador (`runInContext`); `release` si falla. El consumidor no registra ids a mano.
- Servicio con `requireScope`: `PlatformRuntimeModule` registra `PlacedTenantVerifier` (sobre sin tenant o con tenant no ubicado en la región va a la DLQ) y `TenantShardDeliveryContext` (abre `ShardScope` y contexto del tenant alrededor de claim, manejador y `complete`, sin transacción). Efectos y `complete` no se confirman juntos: el consumidor debe ser idempotente por su entrada. Sin shards, `processed_messages` se confirma con los efectos.
- El orden no está garantizado: se usa la versión o el instante del evento para descartar el obsoleto.
- `Permanent` a la DLQ; `Transient` con `base * 2^intento + jitter` de la plataforma. Toda DLQ tiene alerta y procedimiento de reproceso.
- Concurrencia acotada por consumidor; la visibilidad supera el tiempo máximo de procesamiento.
- Sin ciclos sobre la misma cola sin condición de parada.
- Operación interna: clase con `@InternalHandler(Operacion)` que registra `InternalApiModule`. Un servicio con una operación sin handler no arranca (`assertComplete`).

## Idempotencia en la API

- Operación que modifica datos y puede reintentarse lleva llave: `Idempotency-Key` en HTTP, `sagaId:paso:dirección` en la API interna.
- `IdempotencyGate` hace `claim`, `complete` y `release` sobre `ProcessedOperationStore`; `UnitOfWorkRunner` confirma manejador y `complete` juntos. Misma llave y entrada: resultado guardado. Misma llave y otra entrada: 409 o 422.
- Con `requireScope` (ADR 0023): la llave vive en `CatalogIdempotencyStore` y el handler abre sus transacciones (`HandlerUnitOfWork.Handler`). Cada operación es idempotente por su entrada y tiene una prueba de integración que la invoca con dos llaves y verifica efectos y outbox.
- Operaciones naturalmente idempotentes (`PUT` de estado, borrar si existe) no llevan llave.
- Las llaves caducan (24 horas); las limpia `ProcessedOperationRetentionJob`.

## Sagas

- Toda operación interna que modifica datos declara `compensatedBy` en el contrato, o `Compensation.None` si queda tras el pivote.
- Tras el pivote, `idempotent: true`.
- Un paso se reintenta con la misma llave y la entrada registrada, nunca reconstruida.
- `BusinessError` antes del pivote compensa; `TransientFailure` suspende y reintenta.
- La compensación es idempotente y tolera que el paso nunca se aplicara.
- Bitácora en `TypeOrmSagaStore` del orquestador; `SagaRecoveryJob` retoma cada 5 s las sagas con lease vencido.

## Jobs

- Clase que extiende `ScheduledJob` del kernel: `name` (enum de la librería dueña), `schedule`, `exclusive`, `timeoutMs`, `run(context)`. La corre `JobRunner` de `@platform/scheduling`; se prueba llamando a `run()`.
- `exclusive: true` exige un `JobLock` compartido (`ValkeyJobLock`).

## Pruebas

- Dominio y mapper de eventos: unitarias.
- Outbox y consumidor: integración con PostgreSQL y LocalStack. Obligatorio: duplicado, fuera de orden, inválido a DLQ, falla de la base a mitad.
- Con `requireScope`: consumidor por `MessageDispatcher` con el sobre real del outbox (claim en el shard del tenant, reentrega `Duplicate`), y cada operación interna con dos llaves.
- Contrato: el esquema publicado se valida contra el del consumidor.
- Dobles de `@platform/messaging/test-utils` (`InMemoryBus`, `InMemoryOutboxStore`, `InMemoryProcessedMessageStore`), que pasan `runOutboxStoreContract` y `runProcessedMessageStoreContract`.

## Con pstack

Método en `pstack-en-node-template`. De pstack aplican aquí: `principle-make-operations-idempotent`, `principle-separate-before-serializing-shared-state`, `statechart`, `create-formal-verification-skill`, `interrogate`.
