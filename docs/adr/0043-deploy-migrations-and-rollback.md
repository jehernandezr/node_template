# 0043. Deploy, migrations and rollback

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0019](0019-ci-and-toolchain.md), [ADR 0020](0020-terraform-stacks-and-runtime-per-service.md), [ADR 0041](0041-secrets-and-database-credentials.md)

## Context

`deploy.yml` plans and applies in one job, so the prod approval happens before the plan exists; it deploys on push without waiting for CI; it builds per environment; it migrates from a runner that must sit inside the VPC; and nothing defines migration compatibility, partial shard failure, rollback or smoke tests. The OIDC roles trust any branch of an environment.

## Decision

**Artifact.** CI builds once per commit on `main`: one ARM64 image per service (`buildx --platform linux/arm64`, production `node_modules` from `pnpm deploy --prod`, `CMD ["node","main.mjs"]`) and one Lambda zip with its `node_modules`. The image is pushed to the `dev` ECR with tag `sha-<commit>` (immutable) and its digest is recorded. Staging and prod copy that digest into their ECR (`crane copy`) and the stacks reference `image@sha256:<digest>`; the Lambda zip is copied by its SHA-256. A digest mismatch stops the deploy.

**Pipeline.**

1. `deploy.yml` starts on `workflow_run` of a successful `CI` on `main` (dev) or on `workflow_dispatch` with a commit already deployed to the previous environment (staging, prod).
2. A `plan` job per stack and service writes a saved plan, uploads it and prints it to the job summary. On pull requests a read-only role posts the plans of changed stacks as a comment.
3. An `apply` job in the GitHub environment applies only that saved plan. `staging` and `prod` require reviewers; `dev` does not.
4. Order: `global` (only when it changed), `network`, `platform`, `data`, `messaging`, `edge`, then every service in parallel. A new queue therefore exists before its consumer.
5. Per service: register the `migrate` task definition with the new image from the stack's `migrate_task` output, `aws ecs run-task`, wait and require exit code 0; then apply the service plan.
6. The ECS deployment circuit breaker with rollback is on. After the last service, the `deploy-smoke` suite runs against the environment.

**OIDC.** Each role trusts `repo:<repo>:environment:<env>` and also requires `job_workflow_ref` to be `deploy.yml` on `refs/heads/main`. The roles carry a permission boundary that denies changing their own trust and boundary.

**Migrations.**

- Expand and contract: a release only adds (tables, nullable columns, indexes created concurrently, new enum values). Dropping, renaming or tightening happens in a later release, in a migration class with `readonly phase = MigrationPhase.Contract`, once no deployed code uses the old shape.
- `ShardedMigrationRunner` migrates the catalog and then each shard, each under `pg_advisory_lock`. If shard k of N fails, the task exits non-zero, the service is not applied, and the shards already migrated stay migrated: the old code runs on them because every migration is an expansion. The fix goes forward and the rerun skips what is done.
- No down migrations run in the pipeline.

**Contracts across services.** Operations and events are versioned (`.v1`); a change adds a version. Removing one requires that no service in the topology still uses it, so services deploy in parallel in any order.

**Rollback.** Run `deploy.yml` with `rollback_to=<commit>`: it skips `migrate` and applies the service stacks with that commit's digests. Migrations are never rolled back; expand-only migrations keep the previous code working. A tenant move is rolled back with `abort` before its pivot or with another `MoveTenant` after it ([ADR 0032](0032-tenant-moves-and-regions.md)). `MoveShard` is not built and the pipeline launches no saga.

**Smoke tests** (`backend/e2e/deploy-smoke`, HTTP only, against the public domain): every ECS service is stable with healthy targets on `HealthRoute.Ready` (health routes are not public); then, through CloudFront, sign-in with the smoke account; create and read a task; open the SSE stream and receive the task notice within 30 s; read the latest invoice list. It exercises the edge, the internal routing, the bus and real time.

**Recovery targets.** RDS automated backups with point-in-time recovery: 7 days in dev, 14 in staging, 35 in prod. RPO 5 minutes, RTO 4 hours for a restore to a new instance; Multi-AZ in staging and prod. A restore drill runs once in staging during F12 and then each quarter (runbook).

## Consequences

### Positive

- The prod approval sees the exact plan it applies, and prod runs the bytes staging tested.
- The deploy needs no runner inside the VPC.

### Costs

- Breaking schema changes take two releases.
- Rollback restores code, not data.

## Alternatives considered

- Building per environment: staging and prod would run different bytes.
- Migrating from a self-hosted runner in the VPC: one more machine to keep and secure.
- Down migrations on rollback: they destroy data written by the new code.
