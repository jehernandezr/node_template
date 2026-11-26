---
name: backend-messaging-idempotency
description: 'Outbox, SNS/SQS consumers, idempotency, event versioning, DLQ and saga compensations. Use it when publishing, consuming or defining an internal operation.'
paths:
  - 'backend/**/messaging/**'
  - 'backend/libs/platform/messaging/**'
  - 'backend/libs/platform/saga/**'
  - 'backend/libs/platform/internal-api/**'
  - 'backend/libs/contracts/**/events/**'
---

# Messaging and idempotency

ADR 0007 (typed messaging, CloudEvents), ADR 0008 (sagas), ADR 0023 (idempotency with shards). At-least-once delivery: every consumer and every operation that modifies data tolerates duplicates. Code examples and the jobs table in `references/examples.md`.

## Publishing: outbox

- Publish with `MessageBus.publish(event, data)` or `send(command, data)` inside `runInTransaction`. `OutboxMessageBus` stores with `OutboxWriter.append` in that transaction; without a transaction it throws `MessagingError` with `MessagingTransactionRequired`. <!-- id: backend-messaging-idempotency.1 -->
- `OutboxRelayJob` publishes after the commit and marks as sent. <!-- id: backend-messaging-idempotency.2 -->
- Never publish to SNS from the use case, before the commit, or in `afterCommit` without an outbox. <!-- id: backend-messaging-idempotency.3 -->
- The use case builds the event data with an application mapper to the zod contract in `@contracts/<service>/events`; from an aggregate that raises domain events, it takes them with `pullDomainEvents()` first. <!-- id: backend-messaging-idempotency.4 -->
- Type and queue from topology enums (`TopicDef`, `QueueDef`, `Route`). <!-- id: backend-messaging-idempotency.5 -->
- The outbox stores `traceparent`, `tenantid` and `actorid`. <!-- id: backend-messaging-idempotency.6 -->

## Events as contract

- CloudEvents 1.0 with a versioned type: `identity.user.registered.v1`. <!-- id: backend-messaging-idempotency.7 -->
- New optional field: same version. Incompatible change: `v2` in parallel until consumers migrate, then `v1` is retired. <!-- id: backend-messaging-idempotency.8 -->
- The consumer ignores unknown fields. The producer never removes a published field or changes its meaning. <!-- id: backend-messaging-idempotency.9 -->
- No unnecessary personal data; only the id if looking it up is cheap and safe. <!-- id: backend-messaging-idempotency.10 -->
- A change in `backend/libs/contracts` regenerates the front Dart in the same change. <!-- id: backend-messaging-idempotency.11 -->

## Consuming

- A `presentation/` class with a `@Subscribe(Contract)` method. `MessagingExplorer` registers it in `MessageDispatcher`, which validates envelope and schema; an invalid message goes to the DLQ without retry. <!-- id: backend-messaging-idempotency.12 -->
- `MessageDispatcher` handles idempotency with a claim from the `IdempotencyStore` (`ProcessedMessageStore`), key `(consumer, message id)`: `ClaimState.Acquired`, `InProgress` (left for redelivery) or `Completed` (acknowledged without running). `complete` runs in the handler transaction (`runInContext`); `release` if it fails. The consumer does not record ids by hand. <!-- id: backend-messaging-idempotency.13 -->
- Service with `requireScope`: `PlatformRuntimeModule` registers `PlacedTenantVerifier` (an envelope without a tenant or with a tenant not placed in the region goes to the DLQ) and `TenantShardDeliveryContext` (opens `ShardScope` and the tenant context around claim, handler and `complete`, without a transaction). Effects and `complete` are not committed together: the consumer must be idempotent by its input. Without shards, `processed_messages` is committed with the effects. <!-- id: backend-messaging-idempotency.14 -->
- Order is not guaranteed: use the event version or timestamp to discard the stale one. <!-- id: backend-messaging-idempotency.15 -->
- `Permanent` to the DLQ; `Transient` with the platform `base * 2^attempt + jitter`. Every DLQ has an alert and a reprocessing procedure. <!-- id: backend-messaging-idempotency.16 -->
- Bounded concurrency per consumer; visibility exceeds the maximum processing time. <!-- id: backend-messaging-idempotency.17 -->
- No loops on the same queue without a stop condition. <!-- id: backend-messaging-idempotency.18 -->
- Internal operation: a class with `@InternalHandler(Operation)` that `InternalApiModule` registers. A service with an operation without a handler does not start (`assertComplete`). <!-- id: backend-messaging-idempotency.19 -->

## Idempotency in the API

- An operation that modifies data and may be retried carries a key: `Idempotency-Key` in HTTP, `sagaId:step:direction` in the internal API. <!-- id: backend-messaging-idempotency.20 -->
- `IdempotencyGate` does `claim`, `complete` and `release` on `ProcessedOperationStore`; `UnitOfWorkRunner` commits handler and `complete` together. Same key and input: stored result. Same key and different input: 409 or 422. <!-- id: backend-messaging-idempotency.21 -->
- With `requireScope` (ADR 0023): the key lives in `CatalogIdempotencyStore` and the handler opens its own transactions (`HandlerUnitOfWork.Handler`). Each operation is idempotent by its input and has an integration test that invokes it with two keys and checks effects and outbox. <!-- id: backend-messaging-idempotency.22 -->
- Naturally idempotent operations (state `PUT`, delete if it exists) carry no key. <!-- id: backend-messaging-idempotency.23 -->
- Keys expire (24 hours); `ProcessedOperationRetentionJob` cleans them up. <!-- id: backend-messaging-idempotency.24 -->

## Sagas

- Every internal operation that modifies data declares `compensatedBy` in the contract, or `Compensation.None` if it comes after the pivot. <!-- id: backend-messaging-idempotency.25 -->
- After the pivot, `idempotent: true`. <!-- id: backend-messaging-idempotency.26 -->
- A step is retried with the same key and the recorded input, never rebuilt. <!-- id: backend-messaging-idempotency.27 -->
- `BusinessError` before the pivot compensates; `TransientFailure` suspends and retries. <!-- id: backend-messaging-idempotency.28 -->
- Compensation is idempotent and tolerates the step never having been applied. <!-- id: backend-messaging-idempotency.29 -->
- Log in the orchestrator's `TypeOrmSagaStore`; `SagaRecoveryJob` resumes sagas with an expired lease every 5 s. <!-- id: backend-messaging-idempotency.30 -->

## Jobs

- A class extending the kernel `ScheduledJob`: `name` (enum of the owning library), `schedule`, `exclusive`, `timeoutMs`, `run(context)`. `JobRunner` from `@platform/scheduling` runs it; it is tested by calling `run()`. <!-- id: backend-messaging-idempotency.31 -->
- `exclusive: true` requires a shared `JobLock` (`ValkeyJobLock`). <!-- id: backend-messaging-idempotency.32 -->

## Tests

- Domain and event mapper: unit tests. <!-- id: backend-messaging-idempotency.33 -->
- Outbox and consumer: integration with PostgreSQL and LocalStack. Required: duplicate, out of order, invalid to DLQ, database failure midway. <!-- id: backend-messaging-idempotency.34 -->
- With `requireScope`: consumer through `MessageDispatcher` with the real outbox envelope (claim on the tenant shard, `Duplicate` redelivery), and each internal operation with two keys. <!-- id: backend-messaging-idempotency.35 -->
- Contract: the published schema is validated against the consumer's. <!-- id: backend-messaging-idempotency.36 -->
- Doubles from `@platform/messaging/test-utils` (`InMemoryBus`, `InMemoryOutboxStore`, `InMemoryProcessedMessageStore`), which pass `runOutboxStoreContract` and `runProcessedMessageStoreContract`. <!-- id: backend-messaging-idempotency.37 -->

## With pstack

Method in `pstack-in-node-template`. From pstack, these apply here: `principle-make-operations-idempotent`, `principle-separate-before-serializing-shared-state`, `statechart`, `create-formal-verification-skill`, `interrogate`.
