# Operating the services

The five services in the template (identity, tasks, notifications, reports and billing) share the `@platform/service` runtime, so they are operated the same way. This runbook says what to check and what to do in each case.

## Processes

Each service has three entry points, built in `backend/dist/<service>`:

| Entry point   | What it runs                                                        | Local command                   |
| ------------- | ------------------------------------------------------------------- | ------------------------------- |
| `main.mjs`    | The public and internal APIs                                        | `pnpm nx run <service>:serve`   |
| `worker.mjs`  | The SQS consumers, the outbox relay, saga recovery and the jobs     | `pnpm nx run <service>:worker`  |
| `migrate.mjs` | The catalog and per-shard migrations (`catalog`, `shards` or `all`) | `pnpm nx run <service>:migrate` |

In AWS, migrations run as a task before deploying the new version; a failing migration stops the deployment.

The identity seed (`pnpm nx run identity:seed`) creates the region's fixed tenants and registers them in the directory of tasks, notifications, reports and billing, so it runs after those are deployed. It is idempotent: if it fails because a service does not respond, run it again once it responds. A tenant that existed before the services placed tenants is registered by calling `<service>.tenant-directory.place.v1` with its region and its shard groups.

## Health

- `GET /health/live`: the process responds. If it fails, the orchestrator restarts the task.
- `GET /health/ready`: the catalog and every shard respond. A task that is not ready leaves the load balancer without being restarted.

If `ready` fails on every task, check RDS Proxy and the credentials (`DB_CREDENTIALS`) first, then Valkey.

## Jobs

Jobs are `ScheduledJob` instances run by `@platform/scheduling` with a lock in Valkey, so each one runs on a single task at a time.

| Service       | Job                                                                                                                                | What it does                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| identity      | `identity.clean-up-tenant-moves`                                                                                                   | Deletes the source of moves once the grace period has passed |
| identity      | `identity.rotate-login-attempt-partitions`                                                                                         | Creates and drops login attempt partitions                   |
| identity      | `identity.expire-invitations`, `identity.purge-password-resets`, `identity.sweep-reserved-lookups`, `identity.flush-api-key-usage` | Identity maintenance                                         |
| tasks         | `tasks.purge-deleted`                                                                                                              | Deletes removed tasks once their retention has passed        |
| notifications | `notifications.retry-deliveries`                                                                                                   | Retries failed email and push deliveries                     |
| notifications | `notifications.purge-read`                                                                                                         | Deletes old read notifications                               |
| reports       | `reports.expire-runs`                                                                                                              | Expires run results                                          |
| reports       | `reports.backfill-projections`                                                                                                     | Backfills projections from tasks and billing changes         |
| billing       | `billing.close-invoice-periods`                                                                                                    | Closes periods and issues invoices                           |
| billing       | `billing.advance-dunning`                                                                                                          | Advances dunning for failed invoices                         |

Every service also runs the outbox relay, the retention of the outbox and of `processed_messages`, and `SagaRecoveryJob` if it orchestrates sagas. A job that does not run is usually a lock held in Valkey by a dead task: the lock expires on its own with its lease; do not delete it by hand unless the owning task no longer exists.

## Queues and DLQs

Every queue in `topology.json` has its DLQ. A message reaches the DLQ when its handler failed with a non-retryable error or ran out of attempts.

1. Read the message from the DLQ and look up its `traceid` in OpenObserve: the consumer log gives the error code.
2. If the error was transient (a dependency was down), redrive the DLQ to its queue with the SQS console or `aws sqs start-message-move-task`. The consumer processes it only once: `processed_messages` recognizes an already completed message.
3. If the error was in the content (`PLATFORM.MESSAGING.INVALID_ENVELOPE`, `IDEMPOTENCY_CONFLICT`), do not redrive it: fix the producer and discard the message.

## Sagas

A saga in `Suspended` resumes on its own. One in `RequiresIntervention` needs a person: check the log (`saga.instances` and `saga.step_log` on the tenant's shard) for the failed step and its code, fix the cause, and resume or compensate it from the backoffice.

## Common errors

| Code                                 | What it means                                                  | What to do                                                                                 |
| ------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `PLATFORM.SHARDING.TENANT_MIGRATING` | The tenant is being moved; the write waited and did not get in | Nothing: the client retries with `Retry-After`. If it lasts, check the move                |
| `PLATFORM.SHARDING.WRONG_REGION`     | The tenant lives in another region                             | The front retries on its own against `details.apiBaseUrl`; check `REGIONS` if no URL comes |
| `PLATFORM.SHARDING.UNKNOWN_TENANT`   | The service directory does not have the tenant                 | Check that the identity seed ran and that the tenant signup finished                       |
| `PLATFORM.SHARDING.KEY_MISSING`      | A query ran without a tenant or a shard key                    | It is a programming error: fix the use case                                                |
| `BILLING.QUOTA.EXCEEDED`             | The tenant reached its plan's limit                            | The tenant changes plan; support can check usage in billing                                |

## Configuration

Each service validates its configuration at startup and does not start with an invalid value; the log names the variable. The common variables are in `backend/.env.example`. The tenant move variables (`TENANT_MOVE_*`, `TENANT_WRITE_GATE`) and the region variables (`REGIONS`, `SERVICE_REGION`) are described in [moving a tenant](tenant-move.md).
