# 0043. Deploy, migrations and rollback

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0019](0019-ci-and-toolchain.md), [ADR 0020](0020-terraform-stacks-and-runtime-per-service.md), [ADR 0041](0041-secrets-and-database-credentials.md), [ADR 0042](0042-region-and-catalog-model.md)

## Context

`deploy.yml` plans and applies in one job, so the prod approval happens before the plan exists; it deploys on push without waiting for CI; it builds per environment; it migrates from a runner that must sit inside the VPC; and nothing defines migration compatibility, partial shard failure, rollback or smoke tests. The OIDC roles trust any branch of an environment.

## Decision

**Artifact.** CI builds once per commit on `main`, natively on the GitHub-hosted `ubuntu-24.04-arm` runner: one ARM64 image per service (production `node_modules` from `pnpm deploy --prod`, `CMD ["node","main.mjs"]`) and one Lambda zip per service with its `node_modules`. The image is pushed to the `dev` ECR with tag `sha-<commit>` (immutable) and its digest is recorded; the zip goes to the `dev` artifacts bucket at `lambda/<service>/<commit>.zip` with its SHA-256. Each account's `global` stack creates one ECR repository per service (immutable tags, a lifecycle policy that keeps the last 50 `sha-*` images and expires untagged ones after 7 days) and the `<prefix>-artifacts` bucket. In `dev`, the repository and bucket policies let the `staging` and `prod` deploy roles read (their account ids come from `promotion_account_ids` in `environments/dev/common.tfvars`). A promotion copies the image with `crane copy` and the zip with `aws s3 cp` into the target account, and the stacks reference `image@sha256:<digest>` and the zip by its SHA-256. A digest or hash mismatch stops the deploy.

**One-off tasks.** Each service has two stacks ([ADR 0020](0020-terraform-stacks-and-runtime-per-service.md)): `service-base` owns what must exist before the service runs (task, execution and function roles, log groups, the service's secrets from [ADR 0041](0041-secrets-and-database-credentials.md), security groups) and outputs `one_off_task` (cluster, subnets, security group, roles, log group, environment and secrets); `service` owns the runtime (task definitions, ECS services, Lambda functions, target groups, routes, Lattice, alarms) and reads `service-base` through remote state. The pipeline registers each one-off task definition (`migrate`, and for identity `signing-keys` and `seed`) from `one_off_task` with the new image, runs it with `aws ecs run-task`, waits and requires exit code 0. The migrate task connects as `<svc>_owner`. So on a first deploy, and whenever the task changes, everything it needs exists before the `service` apply.

**Pipeline.**

1. `deploy.yml` starts on `workflow_run` of a successful `CI` on `main` (dev) or on `workflow_dispatch` with a commit already deployed to the previous environment (staging, prod).
2. **Preview.** A `preview` job, with the environment's read-only plan role and no approval, plans every stack of the deploy against the current state and writes each plan and its changed addresses and actions (`terraform show -json`) to the job summary and to an artifact. A downstream plan reads upstream outputs as they are before the deploy, so the preview shows intent, not the bytes applied. On pull requests the same job, with the PR plan role, posts the previews of the changed stacks as a comment.
3. **One approval per environment.** A single `deploy` job runs in the GitHub environment. `staging` and `prod` require reviewers, who approve after reading the preview; `dev` does not. It is the only approval of a deploy.
4. **Plan and apply per stack, in order.** Inside `deploy`, each stack is planned with `-out` right after the stack before it is applied, and that saved plan is applied at once, so no plan goes stale. The job stops before an apply whose plan destroys or replaces an address that the preview of that stack did not list. Order: `global` (only when it changed), `network`, `platform`, `data`, `messaging`, `edge`, then each service in catalog order. A new queue therefore exists before its consumer; services may deploy in any order (see contracts below).
5. **Per service:** apply `service-base`; for identity, run `signing-keys` when the key container is empty; run `migrate`; apply `service` with `wait_for_steady_state`, then `aws ecs wait services-stable` for its ECS services and require every target healthy on `HealthRoute.Ready`. The ECS deployment circuit breaker with rollback is on.
6. **After the last service:** run identity's `seed` (the region's fixed tenants and, outside `prod`, the smoke account), then the `deploy-smoke` suite.
7. In F12, `prod` runs the preview only.

**OIDC.** Each role trusts `repo:<repo>:environment:<env>` and also requires `job_workflow_ref` to be `deploy.yml` on `refs/heads/main`. The roles carry a permission boundary that denies changing their own trust and boundary.

**Migrations.**

- Expand and contract: a release only adds (tables, nullable columns, indexes created concurrently, new enum values). Dropping, renaming or tightening happens in a later release, in a migration class with `readonly phase = MigrationPhase.Contract`, once no deployed code uses the old shape.
- `ShardedMigrationRunner` migrates the catalog and then each shard, each under `pg_advisory_lock`. If shard k of N fails, the task exits non-zero, the service is not applied, and the shards already migrated stay migrated: the old code runs on them because every migration is an expansion. The fix goes forward and the rerun skips what is done.
- No down migrations run in the pipeline.

**Contracts across services.** Operations and events are versioned (`.v1`); a change adds a version. Removing one requires that no service in the topology still uses it, so services deploy in parallel in any order.

**Rollback.** Run `deploy.yml` with `rollback_to=<commit>`, a commit deployed to that environment before, so its digests are already in its ECR. The preview and the `deploy` job check out that commit's `service` stack code and tfvars and plan only the `service` stacks, with that commit's digests; `global` to `edge` and `service-base` are not planned and `migrate` is skipped. The preview lists anything the older code would destroy, and `staging` and `prod` reviewers approve it like a deploy. Migrations are never rolled back; expand-only migrations keep the previous code working. A tenant move is rolled back with `abort` before its pivot or with another `MoveTenant` after it ([ADR 0032](0032-tenant-moves-and-regions.md)). `MoveShard` is not built and the pipeline launches no saga.

**Smoke account.** Outside `prod`, identity's `seed` also creates a fixed `smoke` tenant in the region's shared customer group, placed in every service like the other fixed tenants, and its owner `smoke@<domain>`, whose owner role holds every tenant permission. The `SMOKE_ACCOUNT` secret (created empty by identity's `service-base`) holds the email, a password and a TOTP secret. Before running `seed`, the `deploy` job writes fresh random values to it; the seed task receives it as `IDENTITY_SMOKE_ACCOUNT` through its task definition `secrets`, sets that password and TOTP factor on the user and deletes the user's devices and sessions, so every deploy rotates the credential. Only the deploy role can write and read the secret; the API tasks do not receive it. Locally, `smoke.compose.yml` passes a fixed value.

**Smoke tests** (`backend/e2e/deploy-smoke`, HTTP only, against the public domain, after the ECS stability checks of step 5): sign in with the smoke account, answer the new-device MFA challenge with the TOTP code and a fresh device key; create and read a task; open the SSE stream and receive the task notice within 30 s; list the invoices (a 200 that matches the contract; the list may be empty). It exercises the edge, the internal routing, the bus and real time, on both API runtimes (`tasks` runs on Lambda in `dev`).

**Recovery targets.** RDS automated backups with point-in-time recovery: 7 days in dev, 14 in staging, 35 in prod. RPO 5 minutes, RTO 4 hours for a restore to a new instance; Multi-AZ in staging and prod. A restore drill runs once in staging during F12 and then each quarter (runbook).

## Consequences

### Positive

- One approval per environment, after a preview of every stack, and no apply of a stale plan; prod runs the bytes staging tested.
- The deploy needs no runner inside the VPC.

### Costs

- Breaking schema changes take two releases.
- The applied plan of a downstream stack can differ from its preview in updates; only an unlisted destroy or replace stops the deploy.
- Rollback restores code, not data.

## Alternatives considered

- Building per environment: staging and prod would run different bytes.
- Saved plans for every stack made before any apply: downstream plans go stale once an upstream stack applies, and one apply job per stack in a reviewed environment asks for an approval per stack.
- Migrating from a self-hosted runner in the VPC: one more machine to keep and secure.
- Down migrations on rollback: they destroy data written by the new code.
