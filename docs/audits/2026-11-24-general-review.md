# General review of node_template

Branch `main` at commit `249b0f3` (2026-11-24). It covers the whole project: platform, the six services, the front, the infrastructure and CI.

## How it was done

Eleven independent reviewers read the code by area, read-only and without running integration tests:

1. Shards and query routing ("query proxy").
2. Tenant and region relocation.
3. Billing, quotas, metering and reports.
4. Real time, notifications, tasks, flags and search.
5. Cross-cutting architecture and generators (waves 7 to 9A).
6. Identity: credentials and session.
7. Identity: access and lifecycle.
8. Messaging, internal API, sagas, jobs and shutdown.
9. Platform base libraries.
10. Flutter front.
11. Infrastructure, CI/CD and repository tooling.

Each blocker and the central findings were checked against the code afterwards. Paths are relative to the repository root. Part B of wave 9 (the F9 front and the closing documentation) is not in `main` and is not part of this review.

Severities:

- **Blocker**: loses data or money, opens a security hole or keeps the system from working once deployed.
- **Important**: a real failure with a concrete scenario, or an architecture violation that will be copied.
- **Minor**: debt with a bounded consequence.

## Summary

| Area                                              | Blockers | Important | Minor   |
| ------------------------------------------------- | -------- | --------- | ------- |
| Shards and query routing                          | 0        | 10        | 5       |
| Tenant and region relocation                      | 3        | 9         | 6       |
| Billing, quotas, metering and reports             | 4        | 10        | 10      |
| Real time, notifications, tasks, flags and search | 1        | 14        | 6       |
| Cross-cutting architecture and generators         | 0        | 14        | 7       |
| Identity: credentials and session                 | 2        | 10        | 9       |
| Identity: access and lifecycle                    | 3        | 14        | 6       |
| Messaging, internal API, sagas and jobs           | 3        | 9         | 5       |
| Base libraries                                    | 0        | 11        | 10      |
| Front                                             | 2        | 7         | 11      |
| Infrastructure and CI/CD                          | 4        | 9         | 6       |
| **Total**                                         | **22**   | **~117**  | **~81** |

The 22 blockers group into six themes:

1. **Charging.** Billing can charge twice, charge for months of suspension or never close a period. Prod is configured with the fake payment provider.
2. **Data.** A tenant relocation can delete the original. Another one may never finish. A transient Postgres error aborts it.
3. **Identity security.**
   - MFA is bypassed with a device id that can be forged.
   - The same passkey counts as two factors.
   - An API key can grant more permissions than its creator has.
   - A member who is removed and re-invited is locked out.
   - Security alerts are not sent.
4. **Messaging.** A short outage of the database or SNS sends valid messages to the DLQ or leaves them `Dead` without warning. The internal API lets two handlers run the same key at the same time.
5. **Deployment.**
   - The image does not start.
   - Services cannot find each other or receive their secrets.
   - Target group names collide.
   - Lambda does not receive secrets.
6. **Front.** The mobile app logs out after 13 minutes. The backoffice can act on the wrong saga.

---

## 1. Blockers

### Billing

**B1. Period closing may never run.**

- Where: `backend/apps/billing/src/modules/invoices/application/close-invoice-periods.job.ts:27` and `backend/apps/reports/src/modules/runs/application/expire-runs.job.ts:21`.
- Problem: both daily jobs use a 24 h `JobScheduleKind.Interval`. The scheduler sets the first run 24 h after startup (`backend/libs/platform/scheduling/src/job-schedule-planner.ts:53`).
- Scenario: with deployments or restarts every less than 24 h, `CloseInvoicePeriods` never runs. No invoices are issued, free trials are not activated and nothing is charged. When it does run, it runs at any hour.
- Fix: `JobScheduleKind.Cron` anchored in UTC (for example `5 0 * * *`).

**B2. Double charge from a crash between charging and recording.**

- Where: `backend/apps/billing/src/modules/payments/application/charge-invoice.use-case.ts:24` and `collect-invoice.use-case.ts:52`.
- Problem: the provider is called first and the attempt is recorded afterwards, in a separate write. `ChargeRequest` carries no idempotency key.
- Scenario: the provider approves 189,000 and the process crashes before the INSERT into `payment_attempts`. The next run does not see the attempt and charges again.
- Fix: record a `Pending` attempt with its id before charging, in its own transaction, and pass that id to the provider as the idempotency key. When resuming a `Pending`, query the status instead of charging.

**B3. Double charge across replicas.**

- Where: `close-invoice-periods.job.ts:32` with `backend/libs/platform/scheduling/src/job-execution.ts:43`.
- Problem: `Deadline.race` releases the lock after 15 minutes (`timeoutMs`), but `run()` ignores the signal and keeps charging. Nothing reserves each invoice.
- Scenario: 2 replicas and 1,000 invoices at 1.5 s each. After 15 minutes replica B takes the lock, lists the `Issued` ones and charges the ones A has in flight.
- Fix: honor `ctx.signal` between invoices and reserve each one with `SELECT ... FOR UPDATE SKIP LOCKED` or with a `Collecting` status.

**B4. Months of suspension are charged.**

- Where: `backend/apps/billing/src/modules/subscriptions/domain/subscription.ts:141-216` and `typeorm-subscription-maintenance.ts:18`.
- Problem: a suspended subscription keeps its old period. `settle()` reactivates it with that period and the job issues one invoice per day until it catches up.
- Scenario: suspended on February 8 and paid on May 15. On the 16th, 17th and 18th, February, March and April are charged. The integration test already issues a January invoice in November.
- Fix: on reactivation, start the period on the reactivation date.

### Security messaging

**B5. Security alerts and user revocations never arrive.**

- Where: `backend/apps/identity/src/modules/alerts/infrastructure/outbox-security-alerts.ts:28` and `backend/apps/identity/src/modules/sessions/application/revoke-sessions.use-case.ts:84`.
- Problem: `SecurityAlertRaised` and `TokensRevoked` (user scope) are published without `tenantId`. notifications uses `requireScope`, so `PlacedTenantVerifier` answers `false` for an undefined tenant and `TenantGate` sends the message to the DLQ.
- Scenario: password change or "sign out of all sessions". The mandatory alert is not sent and the user's real-time connections stay open. `triggers.consumer.spec.ts:29` calls the use case directly and does not catch it.
- Fix: publish with the user's `homeTenantId`, or accept in `TenantGate` account-scoped subscriptions routed by `UserRef`. Add a test that goes through the dispatcher.

### Tenant relocation

**B6. Cleanup of an old relocation deletes the copy of a new one.**

- Where: `backend/apps/identity/src/modules/tenant-moves/application/tenant-move-cleanup.job.ts:69` and `backend/libs/platform/tenant-move/src/application/tenant-moves.ts:156`.
- Problem: the job does not exclude tenants with a `Running` relocation. `cleanup` only checks that its barrier is still on the shard and that the directory does not point to it.
- Scenario: relocation 1 goes from A to B and its cleanup comes due. Relocation 2 goes back from B to A. Between `finalize` and `switch`, the first one's cleanup purges A. Then `switch` points to an empty A, and the original in B is deleted by the second one's cleanup: permanent loss.
- Fix: skip tenants with a `Running` relocation and do not allow going back to a shard that is still waiting for cleanup. Add a test with the cleanup between `finalize` and `switch`.

**B7. The relocation does not finish with tables without `updated_at`.**

- Where: `backend/libs/platform/tenant-move/src/transfer/batch/batch-tenant-data-transfer.ts:223-252`.
- Problem: `sync` rereads in full, on every call and without a checkpoint, the tables without `updated_at` (`login_attempts`, `saga.step_log`, `user_tenants`, `recovery_codes`).
- Scenario: 300 thousand rows in `login_attempts` with batches of 500. The 4 s budget always runs out on that table, the following ones are never copied and the saga ends in `RequiresIntervention`.
- Fix: in `sync`, only copy new rows from those tables and leave changes to `verify`'s range reconciliation. Another option is to store the cursor in `tenant_move_checkpoints`.

**B8. A transient Postgres error aborts or freezes the relocation.**

- Where: `backend/libs/platform/internal-api/src/nest/internal-api-contract.providers.ts:20`.
- Problem: the internal server uses a `FailureClassifier` without Postgres rules, so every `QueryFailedError` is permanent and answers `protocolViolation`.
- Scenario 1: billing confirms an invoice with its lines between the copy of `invoices` and that of `invoice_lines`. The FK fails (23503) and the saga compensates the whole relocation.
- Scenario 2: an outage during `switch`, after the pivot, leaves the tenant frozen in `RequiresIntervention`.
- Fix: register `PostgresFailureClassifier` in the server's `CallOutcomeFactory`, and answer `RoundPending` on 23503.

### Identity

**B9. MFA is bypassed with a device id that can be forged.**

- Where: `backend/apps/identity/src/modules/devices/application/device-registry.ts:38-58` and `authentication/application/sign-in-with-password.use-case.ts:98`.
- Problem: the device is recognized only by the public id `dv1_<sub>_<htid>_<did>`, without proof that its key is held. A recognized device does not ask for MFA. The design talks about a signed `deviceId`.
- Scenario: with the stolen password and an old access token (its claims are visible to every service and to the web JS), the attacker builds the id and gets in without a second factor. With a passkey, it also gains `amr: device` and `mfaVerifiedAt`, so it passes step-up too.
- Fix: require at sign-in an ES256 signature from the device with the `SignedDeviceRequest` scheme, or an opaque per-device secret stored with HMAC.

**B10. The same passkey counts as first and second factor.**

- Where: `backend/apps/identity/src/modules/passkeys/application/passkey-authentication.use-case.ts:77-121` and `mfa/application/mfa-method-catalog.ts:45`.
- Problem: when a passkey without user verification (UV) asks for a second factor, Passkey is offered, and `verifyPending` requires neither UV nor another credential.
- Scenario: a stolen FIDO key without a PIN opens a session with MFA marked.
- Fix: do not offer Passkey if it was already the first factor, and require `userVerified` in `mfaVerify` and `stepUpVerify`.

**B11. An API key can grant more permissions than its creator has.**

- Where: `backend/apps/identity/src/modules/api-keys/application/manage-api-keys.use-case.ts:66-112`.
- Problem: creating or rotating a key only requires `identity:api-keys:manage`. The service account's permissions are not compared with the actor's.
- Scenario: a role with only `api-keys:manage` creates a key for an account with `billing:write` and `identity:members:read`, and with it reads the emails of every member.
- Fix: `GrantablePermissions.assert(actor, account.permissions)` in `issue` and `rotate`.

**B12. A member who is removed and re-invited is locked out.**

- Where: `backend/apps/identity/src/modules/access/application/tenant-access-setup.ts:153` and `manage-members.use-case.ts:204`.
- Problem: on removal, `auth:pv:user:{t}:{u}` stays at N+1 with no TTL. On re-invite, the membership is created with `permissionVersion: 1`, and the verifier rejects every token with a version lower than the stored one.
- Scenario: the token carries `T.1` against a stored 4: `stalePermissions`. The refresh signs `T.1` again and the cycle repeats.
- Fix: keep the last pv with a tombstone, or create the membership with the stored value plus one.

**B13. Discarding a tenant leaves its access behind and breaks "my tenants".**

- Where: `backend/apps/identity/src/modules/tenants/application/change-tenant-status.use-case.ts:86-103`.
- Problem: the `discard` compensation deletes only the tenant row and the slug. The Owner membership, the roles, the groups, `tenant_access_versions` and the `user_tenants` projection remain.
- Scenario: billing rejects `OpenAccount`, the saga compensates and from then on `GET /v1/me/tenants` answers `TENANT.NOT_FOUND` for that user, forever.
- Fix: have `discard` delete the tenant's access and projection, have `ListMyTenants` tolerate a missing tenant, and add the assertion to `identity-sagas.int-spec.ts`.

### Messaging, internal API and sagas

**B14. A short outage sends valid messages to the DLQ.**

- Where: `backend/libs/platform/messaging/src/dispatch/delivery-classifier.ts:62-79` and `backend/libs/contracts/platform/src/kit/define-messaging.ts:94`.
- Problem: every queue uses 5 attempts with FullJitter at a 1 s base, a window of 7 to 15 s. Infrastructure failures and `InProgress` redeliveries consume the same `receiveCount`.
- Scenario: an RDS Multi-AZ failover (60 to 120 s) sends everything that arrives in that window to the DLQ.
- Fix: do not count infrastructure failures against `maxAttempts`, raise the default to about 10 attempts that reach several minutes, and leave `maxReceiveCount` with ample room above it.

**B15. The outbox marks events `Dead` silently.**

- Where: `backend/libs/platform/messaging/src/outbox/outbox-relay.ts:174-195`.
- Problem: a transport failure leaves the record `Dead` at the tenth attempt (4 to 8 minutes). It is terminal, with no metric, alarm or redelivery. With the breaker open, the rest of the batch spends attempts without publishing. A `Dead` record does not block its FIFO group.
- Scenario: SNS degraded for 10 minutes. Every event in that window is lost without warning, and FIFO consumers receive `Updated` without the `Created`.
- Fix: reserve `Dead` for what can never be delivered. On transport failures, retry without limit with a capped wait and without counting breaker rejections. Publish the `RelayReport` as metrics with an alarm and add a redelivery command.

**B16. Two handlers run the same key at the same time.**

- Where: `backend/libs/platform/internal-api/src/client/call-attempt.ts:51` and `backend/libs/platform/service/src/nest/runtime/platform-runtime.module.ts:406`.
- Problem: the internal server does not enforce the deadline (there is no `signal`). The claim lease is the attempt deadline plus 5 s, about 10 s. With `CatalogIdempotencyStore`, used by the five services, `complete` is not committed together with the effects.
- Scenario: a handler takes 12 s and the client retries with the same key. The lease expired, there is a takeover and a second handler runs in parallel. Both commit effects and events.
- Fix: pass the handler an `AbortSignal` derived from `meta.deadline`, compute the lease with the deadline of the whole call and allow the takeover only if the previous handler finished.

### Infrastructure

**B17. The services image does not start.**

- Where: `backend/infra/scripts/service.Dockerfile:8,13` and `backend/tools/app-bundler/src/app-bundler.ts:39,43`.
- Problem:
  - The bundler writes `main.mjs`, `worker.mjs` and `lambda.mjs`, but the image runs `node main.js`.
  - The bundler leaves dependencies external (`packages: 'external'`) and the image installs none. The Lambda zip has no `node_modules` either.
  - The workers have no `command`, so they run the API.
  - The architecture is ARM64, but the build does not pass `--platform`.
- Scenario: the first deploy fails with "Cannot find module /app/main.js". If the name is fixed, it fails with `ERR_MODULE_NOT_FOUND '@nestjs/core'`.
- Fix: a stage with `pnpm deploy --prod`, `CMD ["node","main.mjs"]`, a default `command` for the workers, `buildx --platform linux/arm64` and a smoke test that starts the image.

**B18. Target group names that collide.**

- Where: `backend/infra/terraform/modules/service-fargate/main.tf:319`.
- Problem: `substr(local.full_name, 0, 32)` gives the API and notifications real time the same name. In dev, the name also ends in a hyphen and AWS rejects it.
- Scenario: the notifications apply fails in every environment. The tests use a short prefix and do not see it.
- Fix: `name_prefix` with `create_before_destroy`, or a truncated name with a hash, and a test case with the real prefix.

**B19. Services cannot find each other or receive their secrets.**

- Where: `backend/infra/terraform/stacks/service/main.tf:33-60`, `backend/infra/terraform/modules/service-fargate/main.tf:307` and each service's `terraform.tfvars`.
- Problem:
  - `INTERNAL_API_BASE_URLS` is mandatory and nothing produces it.
  - There is no Service Connect or Cloud Map.
  - The security group only allows egress to 443.
  - No stack creates `INTERNAL_API_SHARED_SECRET`, the peppers or the signing keys: every tfvars has `secrets = {}`.
  - `WEB_ORIGINS` is not in any tfvars.
- Scenario: billing does not start ("INTERNAL_API_BASE_URLS does not have the identity URL"). If it did start, the web would receive `originRejected` on every call.
- Fix: Service Connect per environment with a `<svc>.internal` alias and an ingress rule to the container port. The URLs are built in the stack. The secrets are created with ephemeral `random_password` and `secret_string_wo`, and `web_origins` is added to the stack.

**B20. With the Lambda runtime the service does not receive its secrets.**

- Where: `backend/infra/terraform/modules/service-lambda/main.tf:30-34` and `backend/libs/platform/service/src/nest/lambda/lambda-bootstrap.ts`.
- Problem: the Lambda only gets the ARNs, for the IAM permission, and `LambdaBootstrap` does not read Secrets Manager.
- Scenario: identity on Lambda fails config validation on every cold start.
- Fix: pass a `SECRETS_MAP` in the environment and resolve it before loading the config, with a port in `adapters/aws`.

### Front

**B21. The mobile app logs out after 13 minutes.**

- Where: `front/packages/auth/lib/src/api_auth_repository.dart:31-52` and `identity_connection.dart:61-69`.
- Problem: mobile never declares its channel: it sends neither `X-Session-Transport: bearer` nor `Authorization: Bearer <session token>`. `ClientChannelResolver` treats it as web and sends the session token in a cookie that `IOClient` discards.
- Scenario: login works, but the first refresh (at ~13 minutes) answers `UNAUTHENTICATED` and the session is closed. `logout()` revokes nothing on the server.
- Fix: a session transport strategy in `ApiAuthRepository` (web or native) with per-request headers, and a fake transport in tests that applies the backend rule.

**B22. The backoffice can act on the wrong saga.**

- Where: `front/microfrontends/backoffice/lib/src/screens/saga_detail_screen.dart:36`, `tenant_detail_screen.dart:30` and `front/microfrontends/billing/lib/src/screens/invoice_detail_screen.dart:33`.
- Problem: go_router reuses the page when only the parameter changes and `ControllerBuilder` does not recreate the controller. tasks, dlq and assistant work around it with a hand-placed `ValueKey`; these three screens do not have it.
- Scenario: verified with a probe test. The URL says `s-102` and the screen shows `s-101`, so the operator compensates the wrong saga.
- Fix: a key by `state.uri` in `_PageWrapper` (`front/packages/shell_core/lib/src/shell_router.dart:211`), or `inputs` in `ControllerBuilder`. Add a navigation test from one id to another.

---

## 2. Important

### 2.1 Shards and query routing ("query proxy")

Routing has a good foundation: a single load per tenant, versioned tombstones and compare-and-set in Lua. The problems show up at the edges: nested transactions, lagging replicas, instance changes and missing Valkey.

- `backend/libs/platform/persistence/src/typeorm-transaction-manager.ts:48-58`: `runInTransaction` resolves in write mode before checking whether a transaction is already open. Every nested write goes through the gate again. If the relocation closes the gate, a transaction that already got in waits 5 to 60 s holding the lock and ends in `TENANT_MIGRATING`: the protocol kills the transactions it was supposed to let finish. **Fix:** if there is already a transaction, resolve in read mode and only touch the guard.
- `backend/libs/platform/sharding/src/router/placement-loader.ts:88-95`: the router reads the directory from the replica, because the runtime does not pass `directoryReadPrimary`. It detects with `isOutdated` that the version is old and delivers it anyway. After a `switch`, reads go to the frozen origin, and a suspended tenant keeps accepting writes for as long as the lag lasts. **Fix:** reread from the primary with `DirectoryWriter.readPlacement`.
- `backend/libs/platform/persistence/src/shard-data-sources.ts:43-69`: changing a shard's instance has a race. An initialized pool is left outside the map and nobody closes it, and after a failover the pools are destroyed and recreated over and over. **Fix:** register the promise before the first `await` and do not let an old instance replace a new one.
- `backend/libs/platform/sharding/src/write-gate/placement-transition.ts:50`: if the placement is already as requested, the transition returns without invalidating or publishing. If the process crashed between writing and invalidating, about 5 minutes of stale placement remain. **Fix:** always invalidate, because it is idempotent.
- `backend/libs/platform/service/src/nest/runtime/runtime-adapter-selector.ts:21-28`: without `VALKEY_HOST` it starts with `NullRoutingCache` and `InProcessDirectoryChannel`, silently. The other replicas do not learn about a suspension or a relocation for 60 s. **Fix:** fail startup outside development.
- `typeorm-transaction-manager.ts:190-199`: the tenant comes from two sources. The shard and the barrier use the `ShardScope`, but `app.tenant_id` comes from the request context, and the audit trigger prefers the session. A saga for B that runs during a request from A is recorded in `audit_log` as A's. **Fix:** use `handle.resolved.tenantId` and have the trigger prefer the row's column.
- `typeorm-transaction-manager.ts:54` and `backend/libs/platform/sharding/src/transaction-shard-guard.ts:36`: the guard is per shard, but the barrier is per tenant. A `ShardScope` for another tenant on the same shard joins the transaction without passing the barrier and rewrites `app.tenant_id`. Today no caller nests like this, but the API allows it. **Fix:** store the (shard, tenant) pair and throw an error if it changes.
- `backend/libs/platform/adapters/postgres/src/database/platform-entity-managers.ts:48` and `typeorm-saga-store.ts:282`: the purges of `idempotency_keys` and of sagas do not go through `TenantMaintenanceSession` or the barrier. They make the relocation's `verify` fail or leave instances without a log. **Fix:** run them in the maintenance session with `unfenced('tenant_id')`.
- `backend/libs/platform/persistence/src/across-shards.ts:106`: `sources.get` is outside the `Deadline` and there is no `connectTimeoutMS`. An instance that does not respond stalls each pass for about 2 minutes, and `fn` keeps running after the deadline expires.
- `backend/libs/platform/persistence/src/tenant-write-fence.ts:37-61`: the barrier uses session locks taken outside the transaction, and ADR 0024 puts the database behind RDS Proxy. With a proxy that multiplexes per transaction, the lock and the unlock land on different backends, and `leave` ignores the boolean from `pg_advisory_unlock_shared`. **Fix:** decide it in the ADR: a transaction lock, or write connections that do not go through the proxy.

### 2.2 Tenant and region relocation

- `backend/libs/platform/tenant-move/src/transfer/batch/tenant-row-filter.ts:49`: `tenant_id::text = $1` prevents index use, so every query scans the table of all tenants. **Fix:** compare against the column's real type.
- `backend/apps/identity/src/modules/tenant-moves/application/start-tenant-move.use-case.ts:74` and `backend/libs/platform/saga/src/model/saga-instance.ts:288`: each `RoundPending` counts as a suspension, with a cap of 20, and the saga has no deadline. If it runs out before the pivot, identity and tasks stay frozen and nobody can sign in. **Fix:** a pending round should not count as a failure, and a deadline that compensates before the pivot.
- `tenant-moves.ts:105-112`: `abort` purges the target before lowering the barrier and opening the gate, so the tenant stays frozen for the whole compensation. **Fix:** open first.
- `tenant-move-shards.ts:29-45`: the origin is taken from the in-process cache, not from the directory, and it can be verified against a stale copy.
- `tenant-moves.ts:81-90`, `tenant-write-fence.ts:100` and `logical-replication-transfer.ts:105`: the time budget is split badly. It starts after `raise`, which waits without `lock_timeout`. With the logical strategy, one call spends three budgets (about 12 s against 6). **Fix:** a single `TransferBudget` per call.
- `logical-replication-transfer.ts:182-195`: `copy_data = true` on a target with old rows from the tenant collides on keys, and the initial copy never finishes.
- `backend/libs/platform/sharding/src/shard-router.ts:62-73`: with a stale cache, region B answers 421 and sends the client back to A. The bounce lasts up to 5 minutes. **Fix:** reload from the directory before answering `WrongRegion`.
- `placement-transition.ts:64`: the collision with a dedicated shard (`ShardTaken`) shows up in `switch`, after the pivot. **Fix:** validate it in `sync`.
- `backend/infra/terraform/stacks/service/main.tf:42` and `remote_state.tf:47`: Terraform builds a per-region catalog with database variable names that differ from the code's, and does not pass `REGIONS`, `SERVICE_REGION` or `TENANT_MOVE_*`. Cross-region relocation cannot work once deployed.

### 2.3 Billing, quotas, metering and reports

- `backend/apps/billing/src/modules/invoices/application/settle-invoice.use-case.ts:53`: two concurrent `mark-paid` webhooks produce write skew. The tenant stays suspended with everything paid. **Fix:** `FOR UPDATE` on the subscription.
- `invoices/domain/invoice.ts:85` and `collect-invoice.use-case.ts:29`: a `Declined` invoice is never retried and `failedAttempts` does not go past 1. **Fix:** retries on a schedule.
- `plans/infrastructure/persistence/typeorm-plan-catalog.ts:45-74`: plans are rewritten under the same id. The invoice takes the new price and the adjustments the old one, and it can end up negative and marked paid without a charge. **Fix:** immutable, versioned plan rows.
- `backend/libs/platform/quotas/src/billing-quota-checker.ts:52`: it discards the `allowed=false` of a suspended subscription, so the suspended tenant keeps using the API.
- `usage-flush.job.ts:40` and `billing-quota-checker.ts:67`: the call quota arrives 3 to 4 minutes late (the design says 10 s), and the check and the consumption are not atomic. **Fix:** atomic `INCRBY` in Valkey per tenant, metric and period.
- `usage/application/track-membership.use-case.ts:19`: the queue is not FIFO, `changedAt` is ignored and removal deletes without a tombstone, so a user can stay counted forever.
- `entitlements/application/entitlement-queries.ts:77`: between the end of the period and the close, usage is measured against the period that already ended.
- `invoices/presentation/invoices.internal-operations.ts:42`: `mark-paid` and `mark-failed` discard `reference` and `reason`, and do not validate the amount paid.
- There is no subscription cancellation, and if the only owner deletes their account, the tenant keeps being charged.
- Tests: billing has no unit tests for its application layer (see section 4).

### 2.4 Real time, notifications, tasks, flags and search

- `backend/libs/platform/realtime/src/auth/auth-state-stream-revocations.ts:20`: the heartbeat only looks at the tenant epoch. Revoking a session or a user depends on an asynchronous frame, and the connection lives until the session expires (days). **Fix:** check on every heartbeat for a revoked session and the user epoch.
- `backend/libs/platform/adapters/valkey/src/realtime/valkey-realtime-stream.ts:122`: the listener is registered before the SUBSCRIBE. If the SUBSCRIBE fails, the channel never subscribes again and memory leaks.
- `valkey-realtime-stream.ts:103` and `realtime-session.ts:40`: resuming from an id earlier than the first retained frame leaves a silent gap. **Fix:** a `resync` frame.
- `realtime-session.ts:102`: the `*` close frame is replayed to new connections on resume, and can kick the user out of a valid session. **Fix:** include `revokedBefore` in the frame.
- `sse-response-sink.ts:23` and `socket-sink.ts:18`: there is no backpressure (the return value of `write()` is ignored) and no cap on connections per user.
- `backend/apps/realtime/src/realtime-app.ts:10`: it does not use `HttpApplicationSetup`, so it has neither CORS nor helmet, and it lives on another hostname. The browser blocks SSE.
- `backend/libs/platform/realtime/src/realtime-components.ts:28`: `REALTIME_AUTH=cookie` reads the `rt_access` cookie, which no service issues, so it answers 401 to everything.
- `sse-transport.ts:64`: a Valkey outage answers 401 instead of 503, and the front closes the session.
- `backend/apps/notifications/src/modules/email/application/send-email.use-case.ts:57`:
  - Problem: a successful send stays `Failed` if recording fails, and nothing reserves the `messageId`.
  - Scenario: the user receives two codes.
  - Fix: `INSERT ... ON CONFLICT DO NOTHING` in `sending` status before sending.
- `email-template.ts:31`: if a parameter is missing, the template silently omits the line. An MFA email goes out without a code, marked `Sent`.
- `backend/libs/platform/search/src/postgres/postgres-hybrid-search.ts:47`: the HNSW index is global per shard and the tenant filter comes afterwards, so a small tenant gets no neighbors. In addition, tasks does not start with `SEARCH_MODE=hybrid` and there is no reindexing when the mode changes.
- `backend/apps/tasks/src/modules/tasks/infrastructure/persistence/typeorm-task-maintenance.ts:62`: `requireEveryShard` ignores shards that are down or time out, and an incomplete personal data deletion is reported as done.
- `backend/apps/identity/src/modules/access/application/access-resolver.ts:65`: flags receive free-text role names as `groups`, and `tenant.kind` as `plan`, so per-plan rules never match.

### 2.5 Identity: credentials and session

- `mfa/application/challenge-verifier.ts:53`: there is no per-user MFA failure counter and step-up is in the Standard tier (600/min). With a stolen session, about 470 TOTP guesses per minute are possible, with a 50 % probability in about 8 h.
- `sessions/application/refresh-session.use-case.ts:57-68`: the rotation is committed before validating the user and the tenant and before signing. If something fails afterwards, the client loses the new generation and the retry is revoked as theft. **Fix:** validate and sign before rotating, and in the grace window return the current token.
- `sessions/application/session-revoker.ts:64`: `auth:revoked:{sid}` is written in `afterCommit` without retry. A Valkey blip leaves the thief's access token alive for up to 15 minutes.
- `passwords/application/confirm-password-reset.use-case.ts:41`: session revocation happens in another transaction. A reset can end up confirmed without revoking, with the token already consumed.
- `passwords/application/request-password-reset.use-case.ts:17`: the synchronous call to notifications only happens with an existing email, which allows account enumeration by timing or by errors. **Fix:** enqueue and answer 202.
- `authentication/application/sign-in-with-password.use-case.ts:78`: the INSERT into `login_attempts` only happens with an existing user, another way to enumerate by timing (medium confidence).
- `mfa/application/mfa-recovery.use-case.ts:107`: a pending recovery neither expires nor is cancelled, and the result of `consume` is ignored.
- There are cycles `authentication↔devices`, `mfa↔devices` and `mfa↔passkeys`, which are broken with `@Global`.
- Specs are missing for `SignInWithPassword`, `RefreshSession`, `ChallengeVerifier`, `VerifyMfa`, `StepUp`, `PasskeyAuthentication`, `SimpleWebAuthnVerifier`, `IssueAccessToken` and `ConfirmPasswordReset`. The test authenticator always sets UV.

### 2.6 Identity: access and lifecycle

- `invitations/application/accept-invitation.use-case.ts:84`: the permission ceiling is only checked when inviting. An invitation from an admin who was already removed stays valid for 7 days.
- `accept-invitation.use-case.ts:118`: the user quota is checked without a reservation. Three simultaneous acceptances leave 7 users on a plan of 5.
- `access/application/manage-members.use-case.ts:90`: `removeErased` skips the last-owner rule. If the only owner deletes their account, the tenant is left headless.
- `users/application/erase-user.use-case.ts:49`: account deletion leaves personal data in `audit_log` (email and name), `invitations.email`, `sessions.ip` and `user_agent`, `login_attempts.ip`, the TOTP secret and the recoveries. A habeas data request ends "successfully" with the email still stored.
- `users/application/confirm-email-change.use-case.ts:51`: the catalog index and the user row are written in different transactions, without compensation. `moveEmail` does not look at `affected`.
- `confirm-email-change.use-case.ts:75`: the `EmailChanged` alert goes to the new address, not the old one.
- `docs/identity/access-matrix.md:70-86`: creating an API key requires recent MFA; inviting, changing groups or roles and editing service accounts do not.
- `access/application/access-version-publisher.ts:30`: the permission version is written in `afterCommit` without retry and with a non-monotonic SET.
- `backend/libs/platform/http/src/endpoint-options.ts:12`: inviting, changing email and creating tenants are in the Standard tier (600/min). The platform can serve as a phishing relay.
- `manage-members.use-case.ts:42`: `list` does not paginate and fires one `Promise.all` per member, also reachable with an API key.
- The 15 identity business modules are `@Global()`, against the backend-nestjs-composition skill. That hides cycles that are resolved with `ModuleRef`.
- Authorization is scattered:
  - Access computes `granted` in the controller.
  - `GrantablePermissions` duplicates `ActorPermissions`.
  - The `Manage*` classes have several methods.
- The access domain is anemic: the invariants live in the application layer, and across the whole repository there are zero uses of `addDomainEvent` and `pullDomainEvents`.

### 2.7 Messaging, internal API, sagas, jobs and shutdown

- `backend/libs/platform/saga/src/engine/step-executor.ts:249`: an `Uncertain` step with an expired deadline is compensated immediately, and the compensation can arrive before the effect. The resource stays reserved forever. **Fix:** a tombstone per saga key and step.
- `saga-instance.ts:282-310`: the 20 suspensions run out in 10 to 25 minutes. Before the pivot, running out goes to `RequiresIntervention` without compensating. That state is terminal, with no API to resume and no alarm.
- `saga-engine.ts:114`: a saga started inside a transaction runs in `afterCommit` and is awaited before returning. The HTTP request waits for the whole saga.
- `backend/libs/platform/persistence/src/nest/persistence-shutdown.hook.ts:16`: Nest 12 closes the `DataSource`s in `onModuleDestroy`, before closing the HTTP server. On a SIGTERM, in-flight requests and those that arrive during shutdown fail.
- `backend/libs/platform/scheduling/src/job-runner.ts:160`: after `timeoutMs`, `running` is cleared and another overlapping pass starts. `stop` does not wait for the real job, and the relay and recovery ignore `signal`.
- `backend/libs/platform/adapters/postgres/src/saga/typeorm-saga-store.ts:194`: recovery orders by `updatedAt`, which the lease does not touch. Fifty poison sagas block the recovery of all the others.
- `backend/libs/platform/messaging/src/nest/messaging.providers.ts:85`: in a service without `requireScope`, the claim, the handler and `complete` run without a transaction, contrary to what the skill says.
- `backend/libs/platform/internal-api/src/nest/internal-api-server.providers.ts:143`: there is no SigV4 verifier on the server, so `INTERNAL_API_SIGNER=sigv4` leaves everything at 401. The alternative exists only on one side.
- `backend/libs/platform/adapters/aws/src/sqs-delivery-processor.ts:53`: the batch of 10 is processed serially with a 30 s visibility, without extending it. The last messages expire and increase `receiveCount`.

### 2.8 Base libraries

- `backend/libs/platform/config/src/sections/service.config.ts:11`:
  - Problem: `NODE_ENV` defaults to `development` and the Lambda module does not set it. Production safeguards depend on it, for example rejecting `IDENTITY_MAILER=console`.
  - Fix: decide by `DEPLOY_ENVIRONMENT`.
- `backend/libs/platform/http/src/nest/endpoint-context.interceptor.ts:72`:
  - Problem: the rxjs `timeout` does not cancel the handler and answers 504 marked as retryable.
  - Scenario: a slow POST is duplicated.
- `backend/libs/platform/adapters/valkey/src/valkey-bloom-filter.ts:73`: `add()` calls that arrive during a rebuild are lost with the RENAME, and false negatives appear.
- `backend/libs/platform/primitives/src/failure/failure-classifier.ts:38`:
  - Problem: `ECONNRESET`, `ETIMEDOUT`, 502 and 504 are classified as "no effects", but they happen after sending.
  - Scenario: a saga does not compensate something that was in fact applied.
- `backend/libs/platform/observability/src/redaction/redaction-rules.ts:17`: the redactor does not catch:
  - plurals such as `tokens` or `passwords`;
  - `key` on its own;
  - a query param at the start of the text;
  - pg's `detail` with the email.
- `observability/src/telemetry/instrumentation-factory.ts:15`: HTTP spans carry the unredacted query, `token=` included.
- `backend/libs/platform/cache/src/single-flight.ts:53`: a hung load by the leader leaves the key hung forever.
- `cache/src/versioned-keyspace.ts:94`: the cache key does not require the tenant. Today no service uses it, but the trap is set.
- `resilience/src/execution/consecutive-circuit-breaker.ts:41`: the HalfOpen probe has no deadline and the circuit can stay open indefinitely. Late failures reopen it.
- `http/src/rate-limit-gate.ts:34`: the auth limit is per exact IP, and on IPv6 it is evaded by rotating within the /64.
- `rate-limit/src/nest/rate-limit.providers.ts:73`: the Valkey limiter has no breaker. With Valkey down, p99 rises by a second.

### 2.9 Cross-cutting architecture and generators

- `backend/apps/{tasks,reports,billing}/src/shared/utils/tenant-shard.ts`: the three copies are identical (same md5), and there are variants in notifications and identity. It is the piece that sets `app.tenant_id` for RLS, and it is an `@Injectable` inside `utils/`. **Fix:** a `ShardScopes` class in `@platform/persistence`.
- There are two parallel repository bases:
  - `ShardedRepository`, `CatalogRepository`, `Criteria` and `PageBuilder` have no consumers outside their library.
  - The 17 real repositories use `TenantIsolatedRepository` with hand-made cursors.
  - ADR 0024 names the first one.
  - **Fix:** pick one of the two.
- There is duplication across services:
  - Four variants of "who is acting".
  - Three cursor shapes, all with `new CursorCodec()` inside the class.
  - Five nearly identical `*-test-app.ts`, 647 lines in total.
  - `migrate.ts` repeated five times.
  - The quota checker brings its own cache when `CacheAside` already exists.
- `backend/apps/notifications/src/modules/email/presentation/email-sender.provider.ts:24`: the adapter choice lives in a `switch` inside `useFactory`, and it builds SES by hand, bypassing `AwsModule`. The same happens in reports and billing. The platform already solves this with tested selector classes.
- Eight files in `application/` inject `AppConfig` and call `root<X>()`, an unchecked cast.
- The new use cases do not implement `UseCase`:
  - `ManageInbox` is a facade and six operations at once.
  - In billing, primitives and dates as text are passed around.
  - `SettleInvoice` exposes two methods.
- `privacy.internal-operations.ts`: the handler orchestrates another module's repository, and dispatch exports its repositories.
- The `TenantDataTransfer` port and tenant-move's `application/` layer depend on TypeORM's `DataSource`.
- Generators:
  - `generators:verify` does not run in CI and does not compare `app.module`. The template no longer includes `MeteringModule` nor generates the relocation rehearsal.
  - Forgetting the line in `TenantMoveParticipants.ALL` means `MoveTenant` does not relocate the new service, and no test catches it.
- OpenAPI (`backend/tools/contracts-export/src/open-api-builder.ts:80`):
  - Query parameters ignore the zod schema: the enum, the limits and `required` are lost.
  - The tasks `PATCH` requires `taskId` in the body as well.

### 2.10 Front

- `front/packages/auth/lib/src/session_manager.dart:185`: on web, `clear()` does not delete the httpOnly cookie. If `sign-out` fails, the next user of the computer gets into the previous account.
- `front/packages/auth/lib/src/flows/mfa_flows.dart:118`: the session stays open if `reloadAccess` fails after login, and `_inFlight` is reused across generations.
- `front/microfrontends/account/lib/src/screens/step_up_gate.dart:45`: step-up is decided with the local clock, and nobody handles `IDENTITY.MFA.STEP_UP_REQUIRED` when the server answers with it.
- `session_manager.dart:162`: expiry is compared with the device clock. A clock that runs ahead refreshes on every call.
- `front/apps/mobile/android/app/src/main/AndroidManifest.xml:2`: it has neither `allowBackup="false"` nor the `INTERNET` permission in the main manifest, so the release build has no network.
- `front/packages/api/lib/src/package_http_transport.dart:43`: the timeout does not cancel the request, and no contract has `Idempotency-Key`. A slow POST is duplicated.
- The auth tests use fake transports that ignore headers, and none navigates from one id to another. That is why the two front blockers pass green.

### 2.11 Infrastructure and CI/CD

- `backend/infra/terraform/modules/oidc-github/main.tf:14`: the three roles trust `repo:X:environment:Y` with no branch or workflow condition. Any branch with `environment: dev` assumes the deploy role, which can widen its own trust. **Fix:** `job_workflow_ref` and a permission boundary.
- `.github/workflows/deploy.yml:95`: plan and apply run in the same job, so prod approval happens before the plan exists. The deploy on push does not wait for CI either.
- `backend/infra/terraform/modules/rds-postgres/main.tf:562`: rotation changes the password, but Fargate injects `DB_CREDENTIALS` only at startup. On day 30 new connections fail. **Fix:** IAM authentication on the proxy.
- `backend/infra/terraform/stacks/platform/compute.tf:105`: the real-time ALB is public, without CloudFront or WAF, and with `TRUST_PROXY_HOPS=2`, so the client IP can be spoofed.
- `backend/infra/scripts/publish-web.sh:29`: `main.dart.js` and the `.part.js` files are published as `immutable` for a year without a hash in the name. `--delete` deletes the chunks and the `.map` files are published.
- `.github/workflows/mobile-release.yml:5`: the keystore secrets are repository secrets, without an environment, and the workflow accepts dispatch from any branch: the signing key can be exfiltrated. If the secrets are missing, it signs with the debug key. `publish-mobile` uploads an `.aab` with a debug signature.
- The tfvars contradict each other: `fargate_api_enabled = false` with services on the `fargate` runtime, and real time without a certificate. The preconditions fail in every environment, and `tf-validate` does not plan the real tfvars.
- `backend/infra/terraform/environments/prod/services/billing/terraform.tfvars:38`: prod uses `BILLING_PAYMENT_PROVIDER = "fake"` with an approved result. Every invoice is marked paid without a charge.
- `check-structure.mjs` does not run in CI, even though the `.claude/hooks/verify-on-stop.mjs` hook says CI catches it again.
- The `terraform` filter in `.github/workflows/ci.yml:53` does not include `.github/workflows/**` or `.nvmrc`.

---

## 3. Minor

**Shards and persistence**

- `catalog-data-source.ts:22`: `close()` does not mark the shutdown.
- `valkey-write-gate.ts:23`: does not normalize the `tenantId`.
- Reads outside a transaction are not `READ ONLY` (`UserShardRepository.read`).
- The `shardGroup` rule only lives in a comment (`shard-router.ts:32`).
- A write transaction costs about 9 round trips to the database.

**Relocation**

- The checksum depends on `TimeZone` and on the collation.
- `TENANT_MOVE_GRACE_DAYS = 0` lowers the barrier.
- The target is recomputed on every call.
- `login_attempts` lands in the target's `default` partition and never expires.
- The origin's password goes in the text of `CREATE SUBSCRIPTION` and can end up in the log.

**Billing and reports**

- The usage flush grows quadratically with a stuck tenant.
- `usage_records` has no retention.
- COP is shown with 2 decimals (49.900 comes out as 499,00) and the sort order mixes currencies.
- A run that always fails stays in `Running`.
- `Expired` is set before deleting the result.
- The out-of-order task projection loses `doneAt`.
- The list of open statuses is copied in three places.
- `billing-accounts.ts:30` does not use a transaction.
- "Today" is computed in UTC.

**Real time and services**

- `open()` does not check `closed` after `subscribe`.
- The unread count is published out of order.
- The inbox looks up by `id` without `userId`.
- `VERSION_MISMATCH` is not declared on the tasks routes.
- The search column is fixed to Spanish.
- Percentage rollout for flags is per user only.

**Identity**

- The login lockout is check-then-act: 20 attempts instead of 5.
- Passkey login does not reject `Deleted`.
- `CaptchaVerifier` and `UnlockAccount` are registered but unused.
- The revocation epoch is not atomic and compares seconds with `<`.
- `2 ** recent` has no cap: it yields `Invalid Date` and blocks recovery for 90 days.
- The passkey catalog has no compensation.
- Step-up with a passkey does not check the session.
- The device approval queue is not atomic.
- Rotating an already rotated key extends its validity.
- `rotate` is not atomic.
- `disable` does not publish `ApiKeyRevoked`.
- The matrix does not show that `members.list` accepts an API key.
- `addMember` ignores the groups if the invitee is already a member.
- IPv4-mapped IPv6 addresses do not pass the CIDR check.

**Platform**

- `HttpException`s do not come out as Problem Details.
- `WEB_ORIGINS` is not validated as a URL.
- `Deadline.toAbortSignal()` is unused and leaves a timer behind.
- `CursorCodec` does not receive a secret in any service.
- There are two SigV4 implementations, one written by hand.
- `RateLimitGuard` and `@RateLimit` are unused and their keys already diverge.
- Cache versions have no TTL.
- `CacheModule.forFeature` shadows the global `Clock` and `IdGenerator`.
- There is a default `new SystemClock()` inside classes.
- The contract export ignores `refine`s and accepts `retry` without `idempotent`.
- `exclusive` does not guarantee one run per cron occurrence.
- The saga store's `SKIP LOCKED` runs in a transaction that commits on read.
- The internal HMAC is a single secret shared by all services.

**Architecture**

- `86_400_000` appears as a magic number in four places.
- `OptimisticLockError` receives literals.
- Search throws `throw new Error` without a code.
- `clock ?? new SystemClock()`.
- `useValue: new ...` inside `forRoot`.
- Static `TimerScheduler`.
- `peerContracts` is duplicated in reports.
- CLAUDE.md says the generators "arrive in F11", and the skills do not mention them.

**Front**

- `AccessRule([])` is only rejected with `assert`: in release it allows everything.
- Opening /login with a session creates another one without revoking the previous one.
- `HandshakeException` is not wrapped as a transport error.
- The assistant consumes effects inside `build` and mutates its state.
- `SignInFlow` receives a concrete class.
- There are exports without `show`.
- The UUID is generated with `Random()`.
- The retry button has no semantics.
- `params ?? ''` hides a missing parameter.
- The auth documentation is in Spanish.

**Infrastructure**

- The infra tests compare text: the pinning checks 3 of 6 workflows and they use short prefixes.
- ECR is created through the CLI without a lifecycle policy.
- `service-catalog.mjs` reimplements HCL.
- The base image is not pinned by digest and there is no `.dockerignore`.
- The `.tfplan` with secrets stays on disk if the apply fails.
- CloudFront has no access logs.

---

## 4. Tests that do not test real behavior

The good part: across the whole repository there are no `jest.fn`, snapshots or assertions on calls, and contract tests against real adapters are plentiful. The problem is what is left untested and the doubles that copy the defect.

- **Billing and reports with almost no application tests.** Billing has 0 unit tests for its 10 use cases, and reports has one. Test files versus code files: identity 83/437, billing 9/126, reports 5/85. Everything depends on int-specs that are skipped without Docker. No double charge, write skew, reactivation or out-of-order case is tested.
- **Identity without specs for its critical cases.** There are no specs for `SignInWithPassword`, `RefreshSession`, `VerifyMfa`, `StepUp`, `PasskeyAuthentication` or `ConfirmPasswordReset`. Several specs test the fakes themselves (`in-memory-*.facade.spec.ts`), and the devices fake copies the faulty recognition. The test authenticator always sets UV.
- **A single tenant per shard.** The sharding tests always seed one tenant per shard, exactly the case that hides the two tenant sources and the transaction with another tenant. The instance change is only tested sequentially.
- **Relocation without concurrent writes.** The relocation rehearsals seed 2 rows and never write during the copy. The helpers repeat `RoundPending` without limit, which hides the cap of 20. There is no test of the real saga against the participants.
- **Tests that do not go through the real path.** `triggers.consumer.spec.ts` does not go through the dispatcher, which is why it does not see blocker B5. `realtime-control.consumer.spec.ts` only verifies calls. "Does not send twice" is sequential.
- **Jobs.** "Does not overlap a hung run" never reaches the timeout, and `HUNG_JOB` cooperates with the abort, unlike the real jobs.
- **Front.** The fake transports ignore headers and no test navigates from one id to another, so B21 and B22 pass green.
- **Infrastructure.** The tests compare text. The short prefixes hide the truncation in B18, and there is no smoke test that starts the image (B17).
- **Trivial tests.** `structural-doubles.spec.ts`, `public-api.spec.ts` and `fake-rate-limiter.spec.ts` test types or doubles.

---

## 5. DI, hexagonal, clean code, SOLID, composition, reuse and organization

**What holds:**

- `check-structure --all` passes.
- No `domain/` imports infrastructure.
- Ports are abstract classes without decorators, and the Nest wiring lives in `src/nest`.
- The platform picks adapters with tested selector classes (`FlagStoreSelector`, `SearchIndexFactory`, `TenantDataTransferSelector`).

**What breaks, by principle:**

- **Dependency injection:**
  - `new` of collaborators inside classes (`CursorCodec`, `BatchTenantDataTransfer`, default `new SystemClock()`).
  - Adapter choice in a `switch` inside `useFactory`.
  - `AppConfig.root<X>()` in the application layer.
  - Modules that shadow global providers.
- **Hexagonal:**
  - TypeORM (`DataSource`) in ports and in tenant-move's `application/`.
  - `HttpProblemError` in access's application layer (already fixed in identity).
  - Presentation handlers that orchestrate other modules' repositories.
- **SOLID:**
  - `Manage*` classes with several use cases, which break single responsibility.
  - Facades that are also use cases.
  - Authorization split between controller and use case.
  - `GrantablePermissions` duplicates `ActorPermissions`.
- **Composition:** 15 `@Global()` business modules in identity, with cycles broken through `ModuleRef`. Identity is the reference, so it gets copied.
- **Domain:** access is anemic, and there is not a single use of domain events in the repository, against the backend-domain skill.
- **Reuse:**
  - `TenantShard` copied five times.
  - Five test apps.
  - Cursors in three shapes.
  - Four variants of "who is acting".
  - Two repository bases, one unused.
  - Unused `RateLimitGuard`.
  - Two SigV4 implementations.
  - Its own cache in quotas.
- **Organization:** `@Injectable` inside `shared/utils`, and fakes of platform ports living in apps.

**Underlying fix:** a dedicated cycle to extract `ShardScopes`, `ActingMember`, `IdCursor` and `ServiceTestApp` into the platform, and to replace the `useFactory` `switch`es with selectors. Also, decide in an ADR whether `@Global` modules and a domain without events are the rule, and if they are, correct the skills.

---

## 6. Filler comments

There are no comments that cite waves, tasks or the plan, and almost all of them explain the why. About 10 % of the ~865 JSDoc blocks repeat the name. Examples:

- "What `plans` offers to the other modules" (`plans.facade.ts:3`), the same sentence in seven facades.
- "In-process `AccessFacade`" (`local-access.facade.ts:13`).
- "Tasks defaults" (`tasks-defaults.constants.ts:1`).
- "Creates the builder." (`front/packages/ui/lib/src/state/controller_builder.dart:7`).

More serious than the filler are the **misleading** comments, because they present as solved what is not:

- Shutdown "stops accepting and waits" (`service-bootstrap.ts:35`).
- `runInContext` "for example to open a transaction" (that context does not exist).
- The saga in a transaction "is returned in `Running`".
- "First period paid" (`subscription.ts:51`), when it is charged at the end.
- Login "with the same cost" for an existing or non-existing email.
- `.env.example:32`: Lambda "reads it at startup".
- `health-registry.ts:13`: the health endpoints "belong to `@platform/http`".

---

## 7. ADR decisions that are not convincing

- **ADR 0020, real time behind a public ALB.** Skipping API Gateway is justified, but not skipping CloudFront and WAF, which support WebSocket and SSE. Today it is the only public entry point without WAF.
- **ADR 0020, "services only egress over HTTPS".** It is incompatible with the synchronous internal API and does not define how another service is discovered. An explicit decision on Service Connect or Cloud Map with its network rule is needed.
- **ADR 0020, workers scaling from zero with Spot.** For consistency queues (the access projection), `min_capacity = 1` and no Spot is better.
- **ADR 0021, custom SigV4.** Reimplementing a cryptographic signature while `@smithy/signature-v4` is installed is exactly the case where reimplementing is reckless.
- **ADR 0021, the Bloom filter "is never empty".** True, but it loses elements during the rebuild. Also, for fewer than 2,000 leaked passwords, an in-memory Set is simpler and does not depend on the network.
- **ADR 0023 and 0024, idempotency in the catalog with a non-atomic `complete`.** All correctness depends on each operation being idempotent by its input. Two phases are better: the result in the target shard, inside the handler's transaction, and only the route in the catalog.
- **ADR 0024, replica by default without session consistency.** There is no "read what I just wrote" for either the data or the directory. **Proposal:** the LSN of the last commit, or a sticky primary for a few seconds.
- **ADR 0024, RDS Proxy with session locks.** It clashes with the relocation barrier. A choice must be made before deploying.
- **ADR 0026, `exclusive`.** It guarantees mutual exclusion, not one run per occurrence. It must say that exclusive jobs still have to be idempotent.
- **ADR 0027, `ControllerBuilder` without inputs.** It forces every screen to remember a key, and three did not.
- **ADR 0027, `StepUpGate` in account.** Step-up is cross-cutting and must live in shell_core.
- **ADR 0027, global `ShellMode`.** It is all or nothing: to connect billing to the real API, every other module must already have its adapter.
- **ADR 0028, asynchronous revocation.** It entrusts revocation to an asynchronous path with no fallback. In addition, table 2.1 of the design and the ADR describe the real-time cookie differently.
- **ADR 0029, cross-tenant maintenance.** It does not define what to do with a partial result, and that allows an incomplete personal data deletion to be reported as done.
- **ADR 0030, omitted lines in templates.** Omitting a line with missing data only makes sense for optional parameters.
- **ADR 0031, invoice numbering per tenant.** There is a single issuer, and the numbering clashes with accounting and with electronic invoicing.
- **ADR 0031, charging at close with no payment method during the trial.** It leaves about 51 free days with a bad card.
- **ADR 0031, "no credit invoices".** False as long as prices are editable.
- **ADR 0031, users counted on the closing day.** It allows lowering the invoice by removing members the day before.
- **ADR 0031, deletion of the only owner.** Account deletion does not protect the only owner.
- **ADR 0032, a region that finds out when the cache expires.** It produces the 421 bounce between regions.
- **ADR 0032, 0-day grace period.** It opens a window without a barrier.
- **ADR 0033, six manual edits after generating.** `MarkedFile` already exists. The critical edit is `TenantMoveParticipants.ALL`.
- **F4 design, a single unversioned `IDENTITY_TOKEN_PEPPER`.** Everything is derived from it, so rotating it invalidates every session and recovery code. **Proposal:** per-purpose subkeys with HKDF and a `kid`.

---

## 8. What is done well and worth keeping

- **Shard router.** It does a single load per tenant and uses tombstones with even and odd versions and compare-and-set in Lua: a load that coincides with an invalidation is never cached.
- **Relocation barrier.** It takes the shared lock before `BEGIN`, separates the barrier (the guarantee) from the gate (the signal) and closes the connection if the unlock fails. The range reconciliation with checkpoints is well thought out.
- **Fencing across the whole core.** Token and version in sagas, lease with `SKIP LOCKED` and FIFO predecessors in the outbox, and three-state claims.
- **Saga engine.** It writes the intent before calling and clearly separates success, business, transient, uncertain and protocol violation.
- **Token verifier.** It pins the algorithm and requires `typ`, `iss`, `aud`, `exp` and `iat`. It rejects `crit`, and the JWKS only accepts P-256.
- **Sessions.** Rotation with an HMAC per generation uses `FOR UPDATE`. Single uses are resolved with `GETDEL` and `WHERE used_at IS NULL`, and the cookie is `__Host-` with `SameSite=Strict`.
- **Access.** `GrantCeiling` applies "removing also counts", `lockForChanges` closes the last-owner race and RLS is forced with `nullif`.
- **Money.** Always in integers of the minor unit, with telescopic proration. Invoice, sequence number and close go in a single transaction, and usage ingestion is idempotent.
- **Base platform.** `Deadline`, `PolicyExecutor` and `Bulkhead` are carefully built. The sliding limiter gives the same result in TS and in Lua, and Problem Details uses an allowlist of details.
- **Real time.** It has a common contract for SSE and Socket.IO tested with two instances, and the email templates escape HTML.
- **Front.** The session has a single in-flight refresh, generations and a write queue. Controllers are tested without widgets, `ApiClient` validates against the contract and a script guards the boundaries between microfrontends.
- **CI.**
  - Actions are pinned by SHA, there is no `pull_request_target` and permissions are declared per job.
  - Everything is encrypted with CMK and logs have retention.
  - RDS in prod is multi-AZ with deletion protection.
  - Terraform secrets are ephemeral and write-only.

---

## 9. Recommended order

### Before F12: two correction cycles

**Cycle 1: money, data and security.** B1 to B16, plus these important ones:

- the suspension cap of the relocation saga;
- the `abort` that opens at the end;
- revocation in the real-time heartbeat;
- the duplicated email;
- the incomplete personal data deletion;
- invitation authorization and recent MFA;
- the rate limit tier for invitations, email change and tenant creation;
- the log redactor;
- the HTTP timeout that duplicates POSTs.

None of them depends on the infrastructure.

**Cycle 2: structure.**

- Extract `ShardScopes`, `ActingMember`, `IdCursor` and `ServiceTestApp` into the platform.
- Pick a single repository base.
- Selectors instead of `useFactory` with `switch`.
- Application unit tests in billing, reports and identity with the scenarios from section 4.
- Decide `@Global` and domain events in an ADR.
- `generators:verify` and `check-structure` in CI.

### F12, in this order

1. **Make the artifact start (B17).** Image with dependencies, `main.mjs`, worker command, ARM64 and a smoke test in CI.
2. **Network and secrets (B19 and B20).** Service Connect with `INTERNAL_API_BASE_URLS`, internal network rule, app secrets created in Terraform, `WEB_ORIGINS` and reading secrets in Lambda.
3. **Global catalog and region variables.** `REGIONS`, `SERVICE_REGION` and `TENANT_MOVE_*`, with the database variable names aligned with the code.
4. **Consistent versioned configuration.** `fargate_api_enabled`, the real-time certificate, target group names without collisions (B18), removing `fake` from prod and a `terraform test` that plans the real tfvars.
5. **Valkey mandatory outside development** and `NODE_ENV` or `DEPLOY_ENVIRONMENT` as the source of the production safeguards.
6. **RDS Proxy versus barrier decision,** and credential rotation with IAM authentication.
7. **Harden the pipeline.**
   - OIDC with `job_workflow_ref`.
   - Plan reviewed before applying.
   - Deploy after CI.
   - Keystore in a protected environment.
   - Correct web caching.
   - CloudFront and WAF in front of real time.
