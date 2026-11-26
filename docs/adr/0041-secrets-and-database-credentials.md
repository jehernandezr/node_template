# 0041. Secrets inventory and database credentials

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0020](0020-terraform-stacks-and-runtime-per-service.md), [ADR 0043](0043-deploy-migrations-and-rollback.md), [ADR 0029](0029-cross-tenant-maintenance-search-per-shard.md), [ADR 0040](0040-internal-routing-and-authentication.md)

## Context

Every service tfvars has `secrets = {}`. No stack creates the identity keys and peppers, the Lambda runtime only receives secret ARNs and never reads them, and RDS rotation changes a password that Fargate injected once at start-up, so connections fail on day 30. The runtime role owns its shards, so migrations and the runtime share one role and the owner skips RLS.

## Decision

**Inventory.** Every secret lives in Secrets Manager with the environment CMK. The stack that owns the consumer creates it; a service's secrets live in its `service-base` stack, so they exist before its one-off tasks and its runtime ([ADR 0043](0043-deploy-migrations-and-rollback.md)).

| Secret                                                | Owner stack                    | Creation                                                                                                                                                                                              | Rotation                                                                                                                                                      | Same in every region |
| ----------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| `IDENTITY_SIGNING_KEYS` (ES256 JWKS, private)         | `service-base` (identity)      | Empty container; `identity:signing-keys` task fills it                                                                                                                                                | Runbook `identity-key-rotation.md`, new `kid` with overlap                                                                                                    | Yes                  |
| `IDENTITY_EMAIL_PEPPER`                               | `service-base` (identity)      | `ephemeral "random_password"` with `secret_string_wo`                                                                                                                                                 | Never (re-keys `identity_lookup`)                                                                                                                             | Yes                  |
| `IDENTITY_TOKEN_PEPPER`, `IDENTITY_API_KEY_PEPPER`    | `service-base` (identity)      | Same                                                                                                                                                                                                  | Never without a re-hash plan                                                                                                                                  | Yes                  |
| `IDENTITY_DEVICE_ID_KEY`, `IDENTITY_DATA_KEY`         | `service-base` (identity)      | Same                                                                                                                                                                                                  | Runbook `secret-rotation.md`                                                                                                                                  | Yes                  |
| `NOTIFICATIONS_EMAIL_PEPPER`                          | `service-base` (notifications) | Same                                                                                                                                                                                                  | Never (re-keys the ledger)                                                                                                                                    | Yes                  |
| `INTERNAL_API_SHARED_SECRET`                          | Not created in AWS             | Only for `INTERNAL_API_AUTH=hmac`                                                                                                                                                                     | `_PREVIOUS` overlap                                                                                                                                           | n/a                  |
| X-Origin-Verify                                       | `platform` (exists)            | Ephemeral, never in the `platform` state; the exception is the `edge` state, where CloudFront stores it as an origin custom header (audit BE-32), so that state bucket stays encrypted and restricted | Authorizer accepts current and previous; apply `platform`, then `edge`                                                                                        | Per region           |
| Database role passwords (`<svc>_owner`, `<svc>_app`)  | `data`                         | `ephemeral "random_password"` with `secret_string_wo`; the bootstrap Lambda reads each secret and creates the role with that password                                                                 | The `data` stack's rotation Lambda (`<prefix>-db-rotation`, single-user strategy) every 30 days; read only by RDS Proxy, that Lambda and the bootstrap Lambda | No                   |
| OpenObserve root user and OTLP `Authorization` header | `platform`                     | `ephemeral "random_password"` with `secret_string_wo`; the header is a second key of the same secret                                                                                                  | Runbook `service-operations.md`, then a forced new deployment of every service                                                                                | No                   |
| `SMOKE_ACCOUNT` (email, password, TOTP secret)        | `service-base` (identity)      | Empty container; the `deploy` job writes it before `seed` ([ADR 0043](0043-deploy-migrations-and-rollback.md))                                                                                        | Every deploy outside `prod`; never created in `prod`                                                                                                          | No                   |
| APNs, FCM, VAPID, payment provider                    | Not in F12                     | Created with their adapters                                                                                                                                                                           | n/a                                                                                                                                                           | n/a                  |

`IDENTITY_TOKEN_PEPPER` stays one unversioned key in F12: rotating it invalidates every session and recovery code. Per-purpose subkeys with HKDF and a `kid` are a backlog item.

"Same in every region" means: when a second region exists, the main region's secret declares a `replica` in it. F12 creates them in one region.

**Delivery.**

- Fargate: the task definition `secrets` (`valueFrom` ARN), injected at task start. A rotation is picked up by a forced new deployment, which the runbooks include.
- Lambda: `SECRETS_MAP` is a JSON map from variable name to ARN. `LambdaBootstrap` resolves it through a new `SecretSource` port (`@platform/config`, adapter `SecretsManagerSecretSource` in `@platform/adapters-aws`, one `BatchGetSecretValue`) before validating the configuration, once per execution environment. A new execution environment picks up a rotation; a deploy forces it.

**Database access.** Each service has three login roles, created by the bootstrap Lambda:

- `<svc>_owner` owns the shards and its catalog and runs only in the `migrate` task, which has its own task role in `service-base`.
- `<svc>_app` runs the service: DML through `ALTER DEFAULT PRIVILEGES FOR ROLE <svc>_owner`, no DDL, not an owner, so RLS always applies. Maintenance keeps its RLS policy ([ADR 0029](0029-cross-tenant-maintenance-search-per-shard.md)); no role has `BYPASSRLS`. Deployed environments therefore move tenants with `TENANT_MOVE_STRATEGY=batch`: the `logical` strategy of [ADR 0032](0032-tenant-moves-and-regions.md) needs a subscription role that bypasses RLS, so it stays local until a decision adds that role.
- `<svc>_reader` has `rds_iam` and `SELECT`, and reads the replicas directly.

Clients reach RDS Proxy with IAM authentication (`iam_auth = "REQUIRED"`); the proxy holds the owner and app passwords and follows their rotation by itself. Readers use IAM tokens against the replicas. A new `DatabaseTokenProvider` port in `@platform/persistence`, adapter in `@platform/adapters-aws` with the RDS signer, gives the pool a fresh token per connection. `DB_AUTH=iam` selects it; `DB_AUTH=password` keeps `DB_PASSWORD` for local and tests.

**RDS Proxy and pinning.** Transactions use `set_config(..., true)` and the shard fence takes advisory locks, which pin the proxy connection for the life of the client connection. That is accepted: the fence stays correct because a pinned connection keeps its session, and the proxy still caps the connections Lambda opens. The `DatabaseConnectionsCurrentlySessionPinned` metric has an alarm, and pools are sized for pinned connections.

## Consequences

### Positive

- No secret value is in Terraform state, tfvars or the repository, except X-Origin-Verify in the `edge` state.
- Password rotation no longer breaks running services, and the runtime role cannot change the schema or skip RLS.

### Costs

- The proxy multiplexes little; its value is IAM auth, the connection cap and faster failover.
- Migrations and the runtime need different credentials, so the `migrate` task has its own role.
- Signing keys need a one-off task after the first identity `service-base` apply and before its `service` apply.

## Alternatives considered

- Passwords injected at start with rotation: fails at the next rotation (general review 2.11).
- `tls_private_key` for the signing keys: the private key would land in state.
- KMS asymmetric signing keys: changes the signer and the JWKS path; kept for later.
