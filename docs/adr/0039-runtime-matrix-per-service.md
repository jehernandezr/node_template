# 0039. Runtime matrix per service

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0020](0020-terraform-stacks-and-runtime-per-service.md), [ADR 0026](0026-scheduled-jobs-scheduledjob-joblock.md), [ADR 0028](0028-real-time-one-stream-per-user.md)

## Context

ADR 0020 lets each service run its API on Lambda or Fargate, but nothing says where the outbox relay, `SagaRecoveryJob`, the scheduled jobs and the queue consumers run under each choice. `fargate_api_enabled` in the `platform` stack couples the platform to service choices, listener priorities are set by hand (`listener_rule_priority = 100`) and no acceptance test covers Lambda.

## Decision

Every service has the components below. The API is the only one whose runtime is a choice.

| Component   | Entry point                             | Runtime                                                    | Runs                                                                 |
| ----------- | --------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `api`       | `main.mjs` or `lambda.handler`          | `fargate` (default) or `lambda`                            | Public routes and `/internal/operations/*`; no background loops      |
| `worker`    | `worker.mjs`                            | Always Fargate, `min_count = 1`                            | Outbox relay, `SagaRecoveryJob`, every `ScheduledJob`, SQS consumers |
| `consumers` | `lambda.consumer` (optional)            | Lambda with SQS event source                               | Consumers moved out of the worker, one queue each                    |
| `realtime`  | `main.mjs` with `REALTIME_HOST=service` | Fargate, only in `notifications`                           | SSE and Socket.IO ([ADR 0045](0045-edge-domains-and-real-time.md))   |
| `migrate`   | `migrate.mjs all`                       | One-off Fargate task per deploy, defined by `service-base` | Migrations ([ADR 0043](0043-deploy-migrations-and-rollback.md))      |

- A service never runs only on Lambda: the worker owns every loop, so the relay and the jobs keep a single home whatever the API runtime is. A consumer moved to Lambda is removed from the worker by the `consumers` map; the worker keeps the rest.
- Defaults: all five services run the API on Fargate in every environment. In `dev`, `tasks` runs its API on Lambda so both runtimes stay in acceptance.
- The internal ALB and its VPC link always exist in deployed environments. `fargate_api_enabled` is removed.
- Listener priorities are computed in the `service` stack from the service's position in the sorted service catalog (`environments/<env>/services/*`), times 10. The tfvars no longer carry them.
- `apps/realtime` stays as the alternative for scaling real time apart from `notifications`. It is not deployed in F12.

## Consequences

### Positive

- The relay, the jobs and saga recovery have one runtime to reason about.
- The platform stack no longer depends on which services pick Fargate.
- Lambda stays tested because one service uses it in `dev`.

### Costs

- Every service pays for one always-on worker task, even with a Lambda API.
- Adding a service shifts the priorities of the services after it; the rules are recreated on the next apply of each.

## Alternatives considered

- Relay and jobs on EventBridge Scheduler invoking Lambda: a minute of granularity delays the outbox, and two schedulers would exist.
- Relay inside the API process: Lambda freezes between requests, and the relay would run in N replicas.
