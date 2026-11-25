# 0008. Orchestrated sagas with a persistent log

- Status: Accepted
- Date: 2026-11-11
- Revised: 2026-11-14 (the log lives in the `saga.instances` and `saga.step_log` tables of the shard's `saga` schema, with `TypeOrmSagaStore`, and the service's catalog keeps a saga directory; see [ADR 0024](0024-persistencia-typeorm-sharding-y-sagas-persistentes.md). `OperationRef` was removed: each step receives the descriptor from `defineOperation`)
- Updated: 2026-11-14 (TypeORM store, `SagaRecoveryJob` as a `ScheduledJob` and the kernel's transaction; see [ADR 0024](0024-persistencia-typeorm-sharding-y-sagas-persistentes.md) and [ADR 0026](0026-jobs-programados-scheduledjob-y-joblock.md))
- Updated: 2026-11-24 (sagas built: `TenantOnboarding`, `DeleteAccount` and `MoveTenant`, all orchestrated by identity; see [ADR 0031](0031-reportes-facturacion-y-sagas-de-identity.md) and [ADR 0032](0032-traslado-de-tenants-y-regiones.md))

## Context

Some operations span several services: signing up a tenant, deleting an account in every service and moving a tenant between shards. If the process crashes halfway, the operation cannot be left half done nor duplicate effects.

## Decision

`libs/platform/saga` coordinates the operations with a persistent log in the shard of the orchestrating service, in the `saga.instances` and `saga.step_log` tables. The store is `TypeOrmSagaStore` with the entities `SagaInstanceEntity` and `SagaStepLogEntity`, in `@platform/adapters-postgres`; `InMemorySagaStore` lives in `@platform/saga/test-utils`.

- Each step is recorded as `Dispatched` with the key `sagaId:step:direction` before calling the target service. The result is then stored in another transaction.
- Whoever runs a saga takes a 30-second lease. `SagaRecoveryJob` is a `ScheduledJob` ([ADR 0026](0026-jobs-programados-scheduledjob-y-joblock.md)) that runs every 5 seconds, with `FOR UPDATE SKIP LOCKED`, and resumes the sagas whose lease expired.
- The steps before `pivot()` have a compensation. The steps after it are idempotent and are retried until they complete.
- Compensations come from the `compensatedBy` of each operation's contract. Renaming an operation breaks the build.
- A `BusinessError` starts the compensation. A `TransientFailure` leaves the saga in `Suspended` until it is resolved.
- The target service stores the result of each call in the same unit of work as its effects: in the internal API, `IdempotencyGate` does `claim`, `complete` and `release` on `ProcessedOperationStore`, and `UnitOfWorkRunner` commits the handler and the `complete` in a single transaction of the `TransactionManager` from `@platform/kernel`. If storing the result fails, the effects are rolled back and the retry applies them once.

### Steps from the contracts

`flow.step()` receives the `OperationDefinition` that the service publishes with `defineOperation` in `backend/libs/contracts/<service>`. The input and output types come from its zod schemas and the compensation comes from its `compensatedBy`:

- An operation with `Compensation.None` or read-only (`mutating: false`) has no compensation.
- Before the pivot, a step that modifies data needs a compensation; with `Compensation.None` it has to go after the pivot. A read-only step can go before it and is skipped when compensating, because there is nothing to undo.
- After the pivot, the operation has to be `idempotent: true`.

### Validation at startup

`SagaEngine` compiles all the definitions in its constructor, not with the first saga of each type, and fails with `PLATFORM.SAGA.INVALID_DEFINITION` if it finds a problem:

- The key in the saga registry equals the definition's `type`.
- With the operation catalog (`contracts`, or the client's when the invoker is `InternalClientInvoker`), each operation and its reversal are registered, the compensation of each step matches the contract's `compensatedBy`, and the steps after the pivot and the compensations are idempotent.
- The default budget of each call (`defaultCallBudgetMs`: attempts, timeouts and waits between attempts) fits in `maxStepDurationMs`. If it does not fit, the last attempt would always be uncertain.

`engine.validate()` returns the list of problems (`SagaDefinitionIssue`) without throwing.

### Invalid input

The internal API client and the server answer the same way to input that does not meet the contract: `BusinessError` with `PLATFORM.VALIDATION.INVALID_INPUT` and `details.fieldErrors`. The client does not call the transport. For the saga the step was not applied, so it compensates from the previous step.

### Trace

The saga stores the `traceparent` in its instance. If whoever starts it does not pass one, it takes the one from the active span, so the saga continues the trace of the request that created it. Each step attempt runs in a `saga.step` span, a child of that trace, and the log stores the step's `traceparent` when recording it as `Dispatched`. A retry, including from another node after a crash, restores that `traceparent`. The internal API client sends it in `CallMeta.traceparent` and the server continues that trace, because the call comes from another platform service.

### Uncertain outcome

A step has an uncertain outcome when the call ends without knowing whether the target service applied the effect. `SagaEngine` (`backend/libs/platform/saga`) gives each call a deadline of `maxStepDurationMs` (25 seconds by default). If the deadline passes, it aborts the call's signal and the result is `uncertain` (`CallOutcomeKind.Uncertain` from `@platform/primitives`). The same happens when the call returns `uncertain` or throws an error that `FailureClassifier` classifies as `Timeout` or `Cancelled`.

The engine records the step as `Uncertain` in the log and leaves the saga in `Suspended` with the code `PLATFORM.SAGA.UNCERTAIN_OUTCOME`. The platform catalog declares it internal, retryable and with status 504.

Recovery follows these rules:

- `SagaRecoveryJob` resumes the saga when `nextAttemptAt` is reached. The wait grows exponentially from 1 second up to 60 seconds.
- The retry uses the same key `sagaId:step:direction` and the input recorded in the log, never a rebuilt input. The target service recognizes the key and the effect happens once.
- Before the pivot, if the saga's deadline (`deadlineMs` when it started) has already passed, the engine does not call again: it compensates from the uncertain step, inclusive. The compensation tolerates the step never having been applied.
- The compensation can reach the participant before the step, which was still in flight. That is why the keys of a step and of its compensation share a base (`<saga>:<step>:forward` and `<saga>:<step>:compensate`, the `CompensationKey` convention from `@platform/internal-api`), and the internal API server, before running a compensation, leaves a tombstone on the step's key: if the step did not arrive, it is completed as compensated (`PLATFORM.INTERNAL_API.STEP_COMPENSATED`) and a late send no longer applies its effect; if it is still running, the compensation answers `in-progress` and the saga repeats it once the step has finished.
- A step can declare with `progressOn` the `transient-failure` reasons that are progress of the participant, such as a copy round that did not fit in its deadline. Those answers repeat the step without spending suspensions; before the pivot they are bounded by the saga's deadline.
- A compensation with an uncertain outcome also stays in `Suspended` and is retried the same way.
- When the failed attempts exceed 20 or the suspension reaches 24 hours (`maxSuspendAttempts` and `maxSuspendAgeMs`), the saga moves to `RequiresIntervention` and a person decides.
- The lease (`leaseMs`) has to be greater than `maxStepDurationMs`; the engine rejects the configuration if it is not. That way no other node resumes the saga while the call is still within its deadline.

### Template sagas

| Saga               | Orchestrator | Before the pivot (with compensation)                                       | After the pivot (idempotent)                                                |
| ------------------ | ------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `TenantOnboarding` | identity     | create the tenant in `Provisioning`, open the account in billing           | activate the tenant, notify the owner through notifications                 |
| `DeleteAccount`    | identity     | suspend the user                                                           | delete their data in tasks, notifications and reports, and then in identity |
| `MoveTenant`       | identity     | `sync` and then `finalize` in the five services (compensated with `abort`) | `switch` in the five services and `FinishMove`                              |

Each one is tested with `CrashingSagaStore`, which crashes the process at every step, and the move saga also with continuous writes across groups and regions. Cleaning up the source of a move is not a step: `TenantMoveCleanupJob` does it once the grace period has passed. The log of `MoveTenant` lives in the shard of the platform tenant, not in that of the tenant being moved.

## Consequences

Positive:

- A saga resumed from the log ends at the same point, including compensations left halfway.
- Each effect happens once, because the target service recognizes the idempotency key.

Costs:

- Each step needs a declared reversal, and at startup it is validated that it exists and is idempotent.
- A slow operation (long timeouts or many attempts) does not fit in a saga without raising `maxStepDurationMs` and `leaseMs`.
- `CompensationFailed` requires manual intervention from the backoffice.
- While a saga runs, the resource stays in an intermediate state (for example, tenant `Provisioning`) that the domain must account for.

## Alternatives considered

- Event choreography: the document keeps it for simple flows that do not need to undo anything.
