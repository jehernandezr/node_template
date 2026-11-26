# F12: infrastructure and deployment

F12 takes the platform from "Terraform that validates" to "a commit on `main` reaches `dev` and `staging` by itself and passes its smoke tests". It starts after [cycle 3](cycle-3-test-speed-and-guards.md). Status per cycle is in the [plan README](README.md#cycles).

## 1. Inventory on `main` (2026-11-26)

Wave 5 built pieces of the pipeline; none of them has run against AWS.

| Piece                                                                | State   | Notes                                                                                                                                                              |
| -------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Stacks `network`, `platform`, `data`, `messaging`, `edge`, `service` | Partial | Validate and pass `terraform test` with mocks (tests in `platform`, `data`, `messaging`, `service`). Not applied anywhere                                          |
| Per-environment tfvars                                               | Partial | Contradict each other: `fargate_api_enabled = false` with Fargate APIs, real time without certificate, `secrets = {}`, `BILLING_PAYMENT_PROVIDER = "fake"` in prod |
| `local` environment on LocalStack                                    | Exists  | `platform` without compute and `messaging`                                                                                                                         |
| `ci.yml` `terraform` job                                             | Exists  | fmt, validate, mocked `terraform test`, tflint, shellcheck; does not plan the real tfvars; filter misses `.github/workflows/**` and `.nvmrc`                       |
| `deploy.yml`                                                         | Partial | Plan and apply in one job, runs on push without waiting for CI, builds per environment, migrates from a runner inside the VPC                                      |
| OIDC module and roles (`platform` stack)                             | Partial | Trust `repo:X:environment:Y` with no workflow condition and no permission boundary                                                                                 |
| Image (`service.Dockerfile`) and bundler                             | Broken  | B17: runs `main.js`, no `node_modules`, workers have no command, no ARM64                                                                                          |
| Entry points `main`, `worker`, `lambda`, `migrate`                   | Exists  | In the five services; `realtime` has `main` only                                                                                                                   |
| `LambdaBootstrap`                                                    | Partial | Does not read secrets (B20); handles API Gateway events only                                                                                                       |
| HTTP transport (`HttpTransport`, `InternalApiController`)            | Exists  | Needs `INTERNAL_API_BASE_URLS`, which nothing produces (B19)                                                                                                       |
| SigV4                                                                | Partial | Client signer in `@platform/adapters-aws`; no verifier on the server                                                                                               |
| `publish-web.yml`, `publish-mobile.yml`, `mobile-release.yml`        | Partial | Wrong web caching, source maps published, keystore in repository secrets, debug-signed fallback                                                                    |
| Internal routing                                                     | Missing | No Service Connect, Cloud Map or Lattice                                                                                                                           |
| App secrets in Terraform                                             | Missing | Only X-Origin-Verify and database passwords exist                                                                                                                  |
| Global stack, domain and certificates                                | Missing |                                                                                                                                                                    |
| Smoke tests against an environment                                   | Missing |                                                                                                                                                                    |
| Alarm catalog, restore drill                                         | Missing | Per-component alarms exist in the modules                                                                                                                          |

## 2. Decisions

The architectural ones have ADRs: [0039](../adr/0039-runtime-matrix-per-service.md) runtime matrix, [0040](../adr/0040-internal-routing-and-authentication.md) internal routing and auth, [0041](../adr/0041-secrets-and-database-credentials.md) secrets and database credentials, [0042](../adr/0042-region-and-catalog-model.md) region and catalog, [0043](../adr/0043-deploy-migrations-and-rollback.md) deploy, migrations and rollback, [0044](../adr/0044-valkey-failure-policy.md) Valkey failure policy, [0045](../adr/0045-edge-domains-and-real-time.md) edge, domains and real time.

Answers to the 18 questions of the plan review:

| #   | Question                         | Decision                                                                                                                                                                                                         | Reason                                                                         |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | What exists from wave 5          | Section 1                                                                                                                                                                                                        | Read from the code, not from the wave table                                    |
| 2   | What "F12 done" means            | Section 3: mocked tests and a LocalStack smoke in CI, plus real `dev` and `staging` deploys with smoke tests; prod is plan only                                                                                  | Mocks alone never caught B17 to B20                                            |
| 3   | Runtimes at acceptance           | Fargate APIs by default, `tasks` on Lambda in `dev`; the worker always on Fargate runs relay, jobs and consumers (ADR 0039)                                                                                      | Both runtimes stay tested; loops have one home                                 |
| 4   | Internal routing                 | VPC Lattice; `/internal` never on the public API (ADR 0040)                                                                                                                                                      | The only option that reaches Lambda and verifies SigV4                         |
| 5   | Internal auth in AWS             | SigV4 with Lattice `AWS_IAM` auth policies from the topology `callees`; HMAC with overlap only locally (ADR 0040)                                                                                                | Caller identity from IAM, no shared secret                                     |
| 6   | Secret inventory                 | ADR 0041 table: owner stack, creation, rotation, region scope, delivery                                                                                                                                          | Each secret has one owner                                                      |
| 7   | Single region                    | Yes; `common.tfvars` keeps regions parameterised; `global` stack for account-wide resources (ADR 0042)                                                                                                           | A second region needs decisions F12 does not need                              |
| 8   | Catalog model                    | One `<service>_catalog` per service and region; identity's holds the global indexes (ADR 0042)                                                                                                                   | Matches the code and the tests                                                 |
| 9   | Migrations and rollback          | Expand and contract, fix forward on partial shard failure, `migrate` as a one-off Fargate task, messaging before services, rollback by digest (ADR 0043)                                                         | Old code keeps running on any migrated shard                                   |
| 10  | Saved plan and promotion         | Apply only a saved, reviewed plan; one artifact per commit promoted by digest (ADR 0043)                                                                                                                         | Prod applies what was reviewed and runs what staging tested                    |
| 11  | RDS Proxy and credentials        | Keep the proxy with IAM client auth, accept pinning, three roles per service, readers by IAM (ADR 0041)                                                                                                          | Rotation stops breaking connections; RLS always applies                        |
| 12  | Valkey                           | Required outside `local`; security checks fail closed, the rest degrade (ADR 0044)                                                                                                                               | A Valkey outage must not revive revoked sessions                               |
| 13  | Fakes in prod                    | Rejected in `staging` and `prod`. Payments use a new `none` provider that leaves invoices open until real charging lands; push uses a new `none` sender (inbox and email only) until APNs, FCM and Web Push land | No invoice is marked paid without a charge, and no adapter pretends to deliver |
| 14  | Real time and domains            | Behind CloudFront and WAF; `app.<env>.<domain>` and `api.<env>.<domain>` (ADR 0045)                                                                                                                              | One edge, a trustworthy client IP                                              |
| 15  | Front delivery                   | Web hosting with correct caching and per-environment `API_BASE_URL`; mobile build and sign only                                                                                                                  | Store publishing needs store accounts                                          |
| 16  | Method and user approval points  | Section 6                                                                                                                                                                                                        | F12 needs the user mid-way                                                     |
| 17  | Carried items and audit findings | Section 5 and the backlog in section 7                                                                                                                                                                           | Every item has a cycle or a backlog row                                        |
| 18  | Cycle 3 split and speed target   | Cycle 3 stays one PR in progress; F12 cycles start when a backend `test-int` affected run takes under 15 minutes on the build machine                                                                            | A cycle with long rounds would starve F12 of review time                       |

## 3. Definition of done

F12 is done when all of these hold:

1. Every cycle below is merged with `ci-ok` green.
2. CI proves, on every PR: `terraform test` plans the real tfvars of `dev`, `staging` and `prod` with mocked providers, and the `local-smoke` job runs the built images against PostgreSQL, Valkey and LocalStack and passes `deploy-smoke`.
3. A merge to `main` deploys `dev` with no manual step, and `deploy-smoke` passes against `https://api.dev.<domain>`.
4. The same commit is promoted to `staging` with one approval, by digest, and `deploy-smoke` passes there.
5. A rollback to the previous commit in `staging` passes `deploy-smoke`.
6. The restore drill in `staging` restores a shard to a point in time within the RTO.
7. `deploy.yml` produces a reviewed saved plan for `prod`. Applying it is the user's choice and outside F12.

Before the prerequisites exist, items 1 and 2 are reachable; items 3 to 7 wait for them.

## 4. Prerequisites

| #   | Prerequisite                                                                                                                                                          | Owner                                          | Needed by                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------- |
| P1  | AWS accounts for `dev`, `staging` and `prod` (one per environment), with an admin role for the first bootstrap                                                        | User                                           | F12-13                     |
| P2  | AWS region and region code, if not `us-east-1` and `us`                                                                                                               | User                                           | F12-13                     |
| P3  | A domain with its Route 53 hosted zone in the `dev` account, or NS delegation to it                                                                                   | User                                           | F12-13                     |
| P4  | GitHub environments `dev`, `staging`, `prod` and `mobile-release`, with reviewers on `staging`, `prod` and `mobile-release`, and the variables listed by `deploy.yml` | User                                           | F12-13                     |
| P5  | `main` branch protection requiring `ci-ok`                                                                                                                            | User                                           | F12-10                     |
| P6  | SES production access in each account and the alarm email                                                                                                             | User                                           | F12-14                     |
| P7  | Android upload keystore and its passwords in `mobile-release`                                                                                                         | User                                           | Store publishing (backlog) |
| P8  | Apple and Google Play developer accounts                                                                                                                              | User                                           | Store publishing (backlog) |
| P9  | Bootstrap: state bucket per account, OIDC provider and roles from the `global` stack                                                                                  | Agent, run with the user's P1 credentials once | F12-13                     |

Everything else is agent work and needs none of the above until F12-13.

## 5. Cycles

One PR per cycle, in this order. Each runs after the previous one is merged.

### F12-1 Artifact that starts (B17)

- **Scope.** `service.Dockerfile` with a `pnpm deploy --prod` stage, `CMD ["node","main.mjs"]`, `buildx --platform linux/arm64`. The bundler emits `main.mjs`, `worker.mjs`, `lambda.mjs` and `migrate.mjs`; the Lambda zip carries its `node_modules`. The `service-fargate` module gives workers `command = ["node","worker.mjs"]` by default. `NODE_ENV=production` set in the Lambda module too.
- **Depends on.** Cycle 3.
- **Acceptance.** `docker buildx build --platform linux/arm64 --build-arg SERVICE=tasks …` succeeds; `docker run` of each service image with the compose dependencies reaches `HealthRoute.Ready`; `node migrate.mjs all` inside the image migrates; the Lambda zip handler loads with `node -e "import('./lambda.mjs')"`.
- **Guard.** CI job `artifact-smoke` builds every service image and checks readiness and the migrate exit code. A `service-fargate` test asserts the worker command.

### F12-2 Local smoke suite

- **Scope.** New `backend/e2e/deploy-smoke` project (`backend/tools/platform-smoke` is a different tool and stays): the HTTP-only suite of ADR 0043, parameterised by base URL and smoke credentials. A `backend/infra/local/smoke.compose.yml` runs the five built images with HMAC internal calls against PostgreSQL, Valkey and LocalStack (SNS and SQS from `topology.json`).
- **Depends on.** F12-1.
- **Acceptance.** `pnpm nx run deploy-smoke:local` passes on a clean machine.
- **Guard.** CI job `local-smoke` in `ci-ok`. It runs on changes to `backend/**` and `.github/workflows/**`.

### F12-3 Consistent Terraform (B18 and the tfvars)

- **Scope.** B18: target group names with `name_prefix` and `create_before_destroy`, and a test with the real prefix of each environment. `environments/<env>/common.tfvars` (ADR 0042) passed by `deploy-aws.sh`. The `global` stack with the OIDC provider and roles moved out of `platform`. Remove `fargate_api_enabled`; listener priorities computed (ADR 0039). Worker `min_count = 1`. `tasks` API on Lambda in `dev`. A `service` stack validation that rejects route prefixes under `/internal`. `tf-validate.mjs` runs `terraform test` against each environment's real tfvars with mocked providers. The CI `terraform` filter adds `.github/workflows/**` and `.nvmrc`.
- **Depends on.** F12-2.
- **Acceptance.** `node backend/infra/scripts/tf-validate.mjs` passes with the real tfvars of `dev`, `staging` and `prod`; reverting the B18 fix makes the notifications test fail.
- **Guard.** The per-environment `terraform test` runs in the CI `terraform` job.

### F12-4 Configuration safeguards and Valkey (ADR 0044)

- **Scope.** `DEPLOY_ENVIRONMENT` replaces `NODE_ENV` as the safeguard source. Valkey required outside `local`; no silent `NullRoutingCache`. Fail-closed checks and 503 instead of 401 in real time. Readiness without Valkey. Circuit breaker on the Valkey rate limiter. Every `fake`, `console` and in-memory adapter rejected in `staging` and `prod`; `BILLING_PAYMENT_PROVIDER=none` and the `none` push sender; the prod and staging tfvars updated.
- **Depends on.** F12-3.
- **Acceptance.** Each row of the ADR 0044 table has an integration test that stops Valkey and checks the outcome; starting identity with `DEPLOY_ENVIRONMENT=prod` and `IDENTITY_MAILER=console` fails.
- **Guard.** Those tests, plus a config test per service that loads its `prod` tfvars environment and rejects any fake.

### F12-5 Catalogs, regions and database access (ADR 0042, ADR 0041)

- **Scope.** One `<service>_catalog` per service in `init.sql`, the `data` stack and the bootstrap Lambda; drop `catalog_owner` and `catalog_reader`. Roles `<svc>_owner`, `<svc>_app` and `<svc>_reader`. RDS Proxy `iam_auth = "REQUIRED"`; IAM database auth on the instance. `DatabaseTokenProvider` port and RDS signer adapter, `DB_AUTH`. `DB_*` names in Terraform equal to the code schema. `REGIONS`, `SERVICE_REGION` and `IDENTITY_REGION` set by the `service` stack. Per-shard `connectTimeoutMS` and `sources.get` inside the deadline in `AcrossShards`. Pinned-connection alarm. Backup retention 7, 14 and 35 days.
- **Depends on.** F12-4.
- **Acceptance.** `platform-flow:e2e` and `local-smoke` pass with per-service catalogs; an integration test shows `<svc>_app` cannot run DDL and sees only its tenant's rows; a `data` stack test asserts IAM auth and the roles.
- **Guard.** Those tests; a `service` stack test asserts that the environment's `DB_*` keys equal the keys of `databaseConfigSchema` (exported as JSON by the contract export).

### F12-6 Secrets (ADR 0041, B20)

- **Scope.** Each owner stack creates its secrets with `ephemeral "random_password"` and `secret_string_wo`; identity's signing-key container and the `identity:signing-keys` one-off task. `SECRETS_MAP` and the `SecretSource` port with `SecretsManagerSecretSource`, resolved by `LambdaBootstrap` before config validation. X-Origin-Verify accepts current and previous values. `WEB_ORIGINS` from `common.tfvars`. A `config-coverage` script reads each service's config schema and the planned task environment and secrets, and fails on a required variable with no source; it writes `docs/runbooks/configuration.md` (variable, source, environments).
- **Depends on.** F12-5.
- **Acceptance.** `terraform test` shows no secret value in plan output; a Lambda test with LocalStack Secrets Manager starts identity from `SECRETS_MAP`; `config-coverage` passes for every service and environment.
- **Guard.** `config-coverage` in the CI `terraform` job, with a drift check on `configuration.md`.

### F12-7 Internal routing and authentication (ADR 0040, B19)

- **Scope.** Lattice service network and services in `platform`; listener rules, target groups and auth policies in `service`; `callees` in `topology.json`; `INTERNAL_API_BASE_URLS` built by the stack. `SigV4Service.VpcLattice`, `INTERNAL_API_AUTH`, `LatticeIdentityAuthenticator`, `INTERNAL_API_SHARED_SECRET_PREVIOUS`. `LambdaBootstrap` accepts the Lattice event for `/internal/operations/*`.
- **Depends on.** F12-6.
- **Acceptance.** Unit tests of the authenticator (known role, unknown role, missing header); a `service` stack test that the auth policy lists exactly the callers from `topology.json`; `local-smoke` still passes with HMAC.
- **Guard.** Those tests and the topology drift check.

### F12-8 Runtime hardening for rolling deploys

- **Scope.** Shutdown order: the HTTP server drains before the `DataSource`s close (general review 2.7). SQS batches processed with visibility extension instead of serially under a fixed 30 s (2.7). Lambda consumer entry `lambda.consumer` and the `consumers` map wiring (ADR 0039).
- **Depends on.** F12-7.
- **Acceptance.** An integration test sends SIGTERM during in-flight requests and sees them complete; a test with a slow handler sees no redelivery within the batch.
- **Guard.** Those tests.

### F12-9 Edge and real time (ADR 0045)

- **Scope.** Real-time routes in the API distribution; ALB restricted to the CloudFront prefix list and `X-Origin-Verify`; `CloudFront-Viewer-Address` as client IP, `TRUST_PROXY_HOPS` removed; the regional real-time certificate and the CloudFront one in `global`; `HttpApplicationSetup` in the real-time app; cookie authenticator removed; SSE heartbeat 20 s.
- **Depends on.** F12-8.
- **Acceptance.** `edge` and `service` stack tests for the behaviours, the prefix list and the listener rule; a realtime test that rejects a spoofed `X-Forwarded-For`.
- **Guard.** Those tests.

### F12-10 Pipeline (ADR 0043)

- **Scope.** `deploy.yml` rewritten: `workflow_run` after CI, build once, digest promotion, saved plans with apply in the environment, `migrate` as a one-off task, ordered stacks, `rollback_to`, smoke at the end. OIDC `job_workflow_ref` and permission boundary; a read-only PR plan role. A `migration-safety` check rejects destructive statements outside `MigrationPhase.Contract`. A `contract-compat` check compares the contract export with `main` and rejects removed versions still referenced in the topology.
- **Depends on.** F12-9.
- **Acceptance.** `actionlint` passes; `deploy-aws.sh` and the pipeline scripts pass their tests in dry-run mode; a fixture migration with `DROP COLUMN` fails `migration-safety`; removing an event version still consumed fails `contract-compat`; a `global` stack test asserts the trust conditions.
- **Guard.** `migration-safety`, `contract-compat` and `actionlint` in `ci-ok`.

### F12-11 Front delivery

- **Scope.** `publish-web.sh` caching rules, no source maps, no `--delete`, a lifecycle rule; `API_BASE_URL` per environment. `mobile-release` environment, branch and tag restriction, failure without keystore. `AndroidManifest.xml` with `INTERNET` and `allowBackup="false"` (general review 2.10).
- **Depends on.** F12-10.
- **Acceptance.** Script tests assert the `Cache-Control` per file type; `flutter build appbundle --release` without keystore fails; the release manifest has the permission.
- **Guard.** The script tests and a manifest check in `check-structure`.

### F12-12 Observability and recovery minimum

- **Scope.** OTLP/HTTP from Fargate and the Lambda layer straight to OpenObserve, with head sampling per environment; OpenObserve reachable only from the VPC, through SSM port forwarding for operators. Alarm catalog per service: 5xx rate, p99 latency, DLQ not empty, oldest message age, sagas in `RequiresIntervention`, RDS CPU, storage, replica lag, pinned connections, Valkey memory. HTTP spans without query strings (2.8). Runbook `restore-drill.md`.
- **Depends on.** F12-11.
- **Acceptance.** `service` stack tests list the alarms; an observability test shows `token=` absent from span attributes.
- **Guard.** Those tests.

### F12-13 First deploy to `dev` (needs P1 to P4, P9)

- **Scope.** Bootstrap the state bucket and apply `global` with the user's credentials once; then `deploy.yml` for `dev` from `main`; run `identity:signing-keys` and the region seed; fix forward what the real apply finds.
- **Depends on.** F12-12 and the prerequisites.
- **Acceptance.** Definition of done item 3, with `tasks` on Lambda.
- **Guard.** `deploy.yml` on every merge to `main`.

### F12-14 Staging, rollback, drill and prod plan (needs P6)

- **Scope.** Promote to `staging`, roll back and forward again, run the restore drill, produce the `prod` saved plan.
- **Depends on.** F12-13.
- **Acceptance.** Definition of done items 4 to 7.
- **Guard.** The `staging` promotion runs on every release.

### Carried items and audit findings per cycle

| Item                                                                                                                                                                        | Cycle                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| B17                                                                                                                                                                         | F12-1                                           |
| B18; tfvars contradictions and real tfvars not planned (2.11); CI `terraform` filter (2.11)                                                                                 | F12-3                                           |
| `NODE_ENV` safeguards (2.8); silent `NullRoutingCache` (2.1); rate limiter without breaker (2.8); Valkey outage answers 401 in SSE (2.4); prod `fake` payment (2.11)        | F12-4                                           |
| Terraform catalog and region variables (2.2); `AcrossShards` without connect timeout (2.1); fence locks versus RDS Proxy (2.1); rotation versus injected credentials (2.11) | F12-5                                           |
| B20; secrets of B19; `WEB_ORIGINS` (B19)                                                                                                                                    | F12-6                                           |
| B19 routing; no SigV4 verifier on the server (2.7)                                                                                                                          | F12-7                                           |
| Shutdown order (2.7); serial SQS batch (2.7)                                                                                                                                | F12-8                                           |
| Real-time ALB without CloudFront and WAF (2.11); real-time app without `HttpApplicationSetup` and cookie mode (2.4)                                                         | F12-9                                           |
| OIDC trust (2.11); plan and apply in one job, deploy before CI (2.11)                                                                                                       | F12-10                                          |
| Web caching (2.11); keystore and debug signing (2.11); Android manifest (2.10)                                                                                              | F12-11                                          |
| Unredacted query in HTTP spans (2.8)                                                                                                                                        | F12-12                                          |
| Group convention without `TENANT_MOVE_TARGETS` has only unit tests (wave 9)                                                                                                 | F12-13: the `dev` deploy runs on the convention |

## 6. How the cycles run

- Each cycle runs with the [`phase-cycle`](../../.claude/workflows/phase-cycle.js) workflow on the pstack method of `CLAUDE.md`: an Opus builder, an independent Opus reviewer with the impact map of cycle 3, up to two correction rounds. The general merges with green checks and starts the next cycle.
- User approval points: the prerequisites before F12-13; the first `global` apply (it creates IAM roles); every `staging` and `prod` apply through the environment reviewers.
- F12-1 to F12-12 never call AWS. A cycle that finds it needs AWS records the gap for F12-13 instead.

## 7. Backlog

Not in F12. Each item is checked against `main` before it is scheduled, because a correction cycle may have closed it.

| Item                                                                                                                  | Source          |
| --------------------------------------------------------------------------------------------------------------------- | --------------- |
| Quota 403 without `metric`, `limit` and `used`; check that `publicDetails` now covers it                              | Wave 8          |
| `tasks` rejects API keys, so service-account quotas do not apply                                                      | Wave 8          |
| Invitation sign-up between two quota checks leaves an account without membership                                      | Wave 8          |
| Load command for organization tenants created before the per-service directory                                        | Wave 9          |
| `UnitRollbackError`; `AwsErrorTranslator` and `ValkeyErrorTranslator` not registered; optional `CursorCodec`          | Wave 3          |
| Unlock epoch TTL, tenant reads on the primary, `password_resets` retention                                            | Wave 6          |
| Ledger and delivery UPSERT, heartbeat `>` comparison, future `resumePoint`                                            | Wave 7          |
| Log-level flag and `Api-Version` transformers: not built                                                              | Plan review m-8 |
| `@Endpoint` options `deprecated`, `flag`, `entitlement`, `signature`, `agreements`: added in the phase that uses each | Plan review m-9 |
| Per-operation internal authorization                                                                                  | ADR 0040        |
| Second region: global indexes, cross-region writes, `auth:*` and bus propagation, cross-region calls and moves        | ADR 0042        |
| `MoveShard` saga                                                                                                      | ARCHITECTURE    |
| OpenTelemetry collector with tail sampling in AWS                                                                     | ADR 0004        |
| Store publishing (needs P7 and P8)                                                                                    | ADR 0045        |
| APNs, FCM, VAPID and real payment provider secrets                                                                    | ADR 0041        |
| Audit "important" findings in sections 2.1 to 2.10 not listed in section 5 and not closed by cycles 1a to 2b          | General review  |
| Executive summary in Claude Docs: refreshed when a stage closes                                                       | Plan review m-7 |

Closed since their hand-off, per ADR 0032: `tenant-directory.remove.v1` without a status check (now `TENANT_HAS_DATA`), the cleanup without pause (now `TENANT_MOVE_CLEANUP_PAUSE_MS`), `processed_messages` left in the source, the doubled logical-move budget, and `IDENTITY_REGION` validated only with `SERVICE_REGION` declared.
