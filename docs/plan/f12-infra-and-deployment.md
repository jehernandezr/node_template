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
| Image (`service.Dockerfile`) and bundler                             | Broken  | B17: runs `main.js`, no `node_modules`, workers have no command, no ARM64, base image not pinned by digest, no `.dockerignore`                                     |
| Entry points `main`, `worker`, `lambda`, `migrate`                   | Exists  | In the five services; identity also has `seed` and `tenant-move`; `realtime` has `main` only                                                                       |
| `LambdaBootstrap`                                                    | Partial | Does not read secrets (B20); handles API Gateway events only                                                                                                       |
| HTTP transport (`HttpTransport`, `InternalApiController`)            | Exists  | Needs `INTERNAL_API_BASE_URLS`, which nothing produces (B19)                                                                                                       |
| SigV4                                                                | Partial | Client signer `SigV4Signer` on `@smithy/signature-v4` in `@platform/adapters-aws`; `ElastiCacheIamAuthTokenProvider` signs by hand; no verifier on the server      |
| ECR repositories                                                     | Partial | Created by `publish-service.sh` through the CLI, without a lifecycle policy                                                                                        |
| `publish-web.yml`, `publish-mobile.yml`, `mobile-release.yml`        | Partial | Wrong web caching, source maps published, keystore in repository secrets, debug-signed fallback                                                                    |
| Internal routing                                                     | Missing | No Service Connect, Cloud Map or Lattice                                                                                                                           |
| App secrets in Terraform                                             | Missing | Only X-Origin-Verify and database passwords exist; the OpenObserve root password lands in state                                                                    |
| Global stack, domain and certificates                                | Missing |                                                                                                                                                                    |
| State bucket bootstrap                                               | Missing | No script; `backend.tfvars` assume the bucket exists                                                                                                               |
| Smoke tests against an environment                                   | Missing |                                                                                                                                                                    |
| Alarm catalog, restore drill                                         | Missing | Per-component alarms exist in the modules                                                                                                                          |

## 2. Decisions

The architectural ones have ADRs: [0039](../adr/0039-runtime-matrix-per-service.md) runtime matrix, [0040](../adr/0040-internal-routing-and-authentication.md) internal routing and auth, [0041](../adr/0041-secrets-and-database-credentials.md) secrets and database credentials, [0042](../adr/0042-region-and-catalog-model.md) region, accounts and catalog, [0043](../adr/0043-deploy-migrations-and-rollback.md) deploy, migrations, rollback and the smoke account, [0044](../adr/0044-valkey-failure-policy.md) Valkey failure policy, [0045](../adr/0045-edge-domains-and-real-time.md) edge, domains and real time, [0046](../adr/0046-providers-and-telemetry-per-environment.md) providers per environment and telemetry in AWS.

Answers to the 18 questions of the plan review:

| #   | Question                         | Decision                                                                                                                                                                                                   | Reason                                                                            |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | What exists from wave 5          | Section 1                                                                                                                                                                                                  | Read from the code, not from the wave table                                       |
| 2   | What "F12 done" means            | Section 3: mocked tests and a LocalStack smoke in CI, plus real `dev` and `staging` deploys with smoke tests; prod is preview only                                                                         | Mocks alone never caught B17 to B20                                               |
| 3   | Runtimes at acceptance           | Fargate APIs by default, `tasks` on Lambda in `dev`; the worker always on Fargate runs relay, jobs and consumers (ADR 0039)                                                                                | Both runtimes stay tested; loops have one home                                    |
| 4   | Internal routing                 | VPC Lattice; `/internal` never on the public API (ADR 0040)                                                                                                                                                | The only option that reaches Lambda and verifies SigV4                            |
| 5   | Internal auth in AWS             | SigV4 with Lattice `AWS_IAM` auth policies from the topology `callees`; HMAC with overlap only locally (ADR 0040)                                                                                          | Caller identity from IAM, no shared secret                                        |
| 6   | Secret inventory                 | ADR 0041 table: owner stack, creation, rotation, region scope, delivery                                                                                                                                    | Each secret has one owner                                                         |
| 7   | Single region                    | Yes; `common.tfvars` keeps regions parameterised; one `global` stack per account (ADR 0042)                                                                                                                | A second region needs decisions F12 does not need                                 |
| 8   | Catalog model                    | One `<service>_catalog` per service and region; identity's holds the global indexes (ADR 0042)                                                                                                             | Matches the code and the tests                                                    |
| 9   | Migrations and rollback          | Expand and contract, fix forward on partial shard failure, `migrate` as a one-off Fargate task defined by `service-base`, messaging before services, rollback of the `service` stacks by digest (ADR 0043) | Old code keeps running on any migrated shard                                      |
| 10  | Plan, approval and promotion     | A preview of every stack, one approval per environment, then each stack planned and applied in order from its own saved plan; one artifact per commit promoted by digest (ADR 0043)                        | The reviewer sees what changes, no plan goes stale, prod runs what staging tested |
| 11  | RDS Proxy and credentials        | Keep the proxy with IAM client auth, accept pinning, three roles per service, readers by IAM (ADR 0041)                                                                                                    | Rotation stops breaking connections; RLS always applies                           |
| 12  | Valkey                           | Required outside `local`; security checks fail closed, the rest degrade (ADR 0044)                                                                                                                         | A Valkey outage must not revive revoked sessions                                  |
| 13  | Fakes in prod                    | `dev` allows the fake payment provider and the in-memory push sender; `staging` and `prod` reject every fake, console and in-memory adapter and use new `none` providers for payments and push (ADR 0046)  | No invoice is marked paid without a charge, and no adapter pretends to deliver    |
| 14  | Real time and domains            | Behind CloudFront and WAF; `app.<env>.<domain>` and `api.<env>.<domain>` (ADR 0045)                                                                                                                        | One edge, a trustworthy client IP                                                 |
| 15  | Front delivery                   | Web hosting with correct caching and per-environment `API_BASE_URL`; mobile build and sign only                                                                                                            | Store publishing needs store accounts                                             |
| 16  | Method and user approval points  | Section 6                                                                                                                                                                                                  | F12 needs the user mid-way                                                        |
| 17  | Carried items and audit findings | Section 5 and the backlog in section 7                                                                                                                                                                     | Every item has a cycle or a backlog row                                           |
| 18  | Cycle 3 split                    | Cycle 3 stays one PR; F12-1 starts when it is merged. No timing target                                                                                                                                     | One PR per cycle keeps the review focused                                         |

## 3. Definition of done

F12 is done when all of these hold:

1. Every cycle below is merged with `ci-ok` green.
2. CI proves, on every PR that touches their paths: `terraform test` plans the real tfvars of `dev`, `staging` and `prod` with mocked providers (`terraform` job), `artifact-smoke` builds the ARM64 images and starts them, and `local-smoke` runs those images against PostgreSQL, Valkey and LocalStack and passes `deploy-smoke`. The three jobs are in `ci-ok`; a job skipped by its path filter counts as passed.
3. A merge to `main` deploys `dev` with no manual step, and `deploy-smoke` passes against `https://api.dev.<domain>`.
4. The same commit is promoted to `staging` by digest, after one approval of its preview, and `deploy-smoke` passes there.
5. A rollback to the previous commit in `staging` passes `deploy-smoke`.
6. The restore drill in `staging` restores a shard to a point in time within the RTO.
7. `deploy.yml` produces the `prod` preview (every stack planned against the `prod` state) for review. Applying `prod` is the user's choice and outside F12.

Before the prerequisites exist, items 1 and 2 are reachable; items 3 to 7 wait for them.

## 4. Prerequisites

| #   | Prerequisite                                                                                                                                                                                                                                                                 | Owner                                        | Needed by                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| P1  | AWS accounts for `dev`, `staging` and `prod` (one per environment), and an IAM Identity Center admin profile per account on the build machine (`aws sso login --profile <env>-admin`). The agent uses the short-lived session through `AWS_PROFILE`; no access key is stored | User                                         | F12-18 (`dev`), F12-19 (`staging`, `prod`)   |
| P2  | AWS region and region code, if not `us-east-1` and `us`                                                                                                                                                                                                                      | User                                         | F12-18                                       |
| P3  | A domain whose apex public hosted zone lives in the `prod` account (ADR 0042). After each `global` apply of `dev` and `staging`, the user adds the NS records it prints for `dev.<domain>` and `staging.<domain>` to the apex zone                                           | User                                         | F12-18 (`dev`), F12-19 (`staging`)           |
| P4  | GitHub environments `dev`, `staging`, `prod` and `mobile-release`, with reviewers on `staging`, `prod` and `mobile-release`, and the variables listed by `deploy.yml` (account ids, region)                                                                                  | User                                         | F12-18 (`dev`), F12-19 (`staging` reviewers) |
| P5  | `main` branch protection requiring `ci-ok`                                                                                                                                                                                                                                   | User                                         | F12-18                                       |
| P6  | SES production access in the `staging` account, and the alarm email                                                                                                                                                                                                          | User                                         | F12-19                                       |
| P7  | Android upload keystore and its passwords in `mobile-release`                                                                                                                                                                                                                | User                                         | Store publishing (backlog)                   |
| P8  | Apple and Google Play developer accounts                                                                                                                                                                                                                                     | User                                         | Store publishing (backlog)                   |
| P9  | Bootstrap per account: run `bootstrap-account.sh` (state bucket) and the first `global` apply, following `first-deploy.md` (both built in F12-3)                                                                                                                             | Agent, with the P1 session, once per account | F12-18 (`dev`), F12-19 (`staging`, `prod`)   |

F12-1 to F12-17 need none of the above.

## 5. Cycles

One PR per cycle, in this order. Each runs after the previous one is merged. A cycle updates the docs named in its scope in the same PR.

### F12-1 Artifact that starts (B17)

- **Scope.** `service.Dockerfile` with a `pnpm deploy --prod` stage, the base image pinned by digest, `CMD ["node","main.mjs"]`, and a root `.dockerignore`. CI builds natively on the GitHub-hosted `ubuntu-24.04-arm` runner. The bundler emits `main.mjs`, `worker.mjs`, `lambda.mjs` and `migrate.mjs` (plus `seed.mjs` and `tenant-move.mjs` for identity); the Lambda zip carries its `node_modules`. The `service-fargate` module gives workers `command = ["node","worker.mjs"]` by default. `NODE_ENV=production` set in the Lambda module too.
- **Depends on.** Cycle 3.
- **Acceptance.** `docker build --build-arg SERVICE=tasks …` succeeds on the ARM64 runner; `docker run` of each service image with the compose dependencies reaches `HealthRoute.Ready`; `node migrate.mjs all` inside the image migrates; the Lambda zip handler loads with `node -e "import('./lambda.mjs')"`.
- **Guard.** CI job `artifact-smoke` in `ci-ok`, filtered on `backend/**`, `.github/workflows/**`, `pnpm-lock.yaml` and `.nvmrc`: it builds every service image and checks readiness and the migrate exit code. A `service-fargate` test asserts the worker command.

### F12-2 Local smoke suite and smoke account

- **Scope.** New `backend/e2e/deploy-smoke` project (`backend/tools/platform-smoke` is a different tool and stays): the HTTP-only suite of ADR 0043, parameterised by base URL and the `SMOKE_ACCOUNT` JSON. Identity's `seed` creates the smoke tenant and its owner with a TOTP factor when `IDENTITY_SMOKE_ACCOUNT` is set (ADR 0043). A `backend/infra/local/smoke.compose.yml` runs the five built images with HMAC internal calls against PostgreSQL, Valkey and LocalStack (SNS and SQS from `topology.json`), with a fixed local smoke account from `backend/infra/local/smoke.env`.
- **Depends on.** F12-1.
- **Acceptance.** `pnpm nx run deploy-smoke:local` passes on a clean machine; a second run passes too, so the seed is idempotent and resets the account.
- **Guard.** CI job `local-smoke` in `ci-ok`, with the same path filter as `artifact-smoke`.

### F12-3 Global stack and account bootstrap (ADR 0042, ADR 0043)

- **Scope.** The `global` stack (state key `global/terraform.tfstate`): the GitHub OIDC provider and roles moved out of `platform`; one ECR repository per service with immutable tags, a lifecycle policy and, in `dev`, a repository policy that lets the `staging` and `prod` deploy roles pull; the `<prefix>-artifacts` bucket for Lambda zips with the same cross-account read; the environment hosted zone (`dev` and `staging`) or a data source on the apex zone (`prod`); the CloudFront certificate in `us-east-1`. `publish-service.sh` stops creating repositories. `backend/infra/scripts/bootstrap-account.sh` creates the state bucket (versioned, KMS, S3 native locking) and is idempotent. Runbook `docs/runbooks/first-deploy.md`: P1 session, bootstrap, first `global` apply, NS delegation (P3), GitHub variables (P4). Docs: the stacks section of `backend/infra/terraform/README.md` and the ARCHITECTURE stack table.
- **Depends on.** F12-2.
- **Acceptance.** `global` stack tests with mocked providers assert the repository policy principals, the lifecycle rule and the bucket policy; `bootstrap-account.sh` passes shellcheck and a dry-run test that prints the calls it would make.
- **Guard.** Those tests in the CI `terraform` job.

### F12-4 Consistent Terraform (B18 and the tfvars)

- **Scope.** B18: target group names with `name_prefix` and `create_before_destroy`, and a test with the real prefix of each environment. `environments/<env>/common.tfvars` (ADR 0042) passed by `deploy-aws.sh`. The `service` stack split into `service-base` (roles, log groups, secret containers and the one-off task settings: ADR 0043) and `service` (runtime). Remove `fargate_api_enabled`; listener priorities computed (ADR 0039). Worker `min_count = 1`. `tasks` API on Lambda in `dev`. A `service` stack validation that rejects route prefixes under `/internal`. `tf-validate.mjs` runs `terraform test` against each environment's real tfvars with mocked providers. The CI `terraform` filter adds `.github/workflows/**` and `.nvmrc`. Docs: `backend/infra/terraform/README.md` (no `fargate_api_enabled`, the two service stacks).
- **Depends on.** F12-3.
- **Acceptance.** `node backend/infra/scripts/tf-validate.mjs` passes with the real tfvars of `dev`, `staging` and `prod`; reverting the B18 fix makes the notifications test fail; a `service` stack test reads `service-base` outputs from a mocked remote state.
- **Guard.** The per-environment `terraform test` runs in the CI `terraform` job.

### F12-5 Configuration safeguards and providers (ADR 0046)

- **Scope.** `DEPLOY_ENVIRONMENT` replaces `NODE_ENV` as the safeguard source. The provider rules of ADR 0046: `dev` allows `BILLING_PAYMENT_PROVIDER=fake` and `NOTIFICATIONS_PUSH_SENDER=memory`; `staging` and `prod` reject every `fake`, `console`, `memory` and `smtp` adapter. New `none` payment provider and `none` push sender. `IDENTITY_SMOKE_ACCOUNT` rejected in `prod`. The `dev`, `staging` and `prod` tfvars updated.
- **Depends on.** F12-4.
- **Acceptance.** Starting identity with `DEPLOY_ENVIRONMENT=prod` and `IDENTITY_MAILER=console` fails; billing with `none` closes a period and leaves the invoice `Issued`; notifications with the `none` push sender delivers to the inbox and email only.
- **Guard.** A config test per service that loads its `staging` and `prod` tfvars environment and rejects any fake.

### F12-6 Valkey failure policy (ADR 0044)

- **Scope.** Valkey required outside `local`; no silent `NullRoutingCache` or in-process directory channel. Fail-closed checks and 503 instead of 401 in real time. Readiness without Valkey. Deadline and circuit breaker on every Valkey call, including the rate limiter. The `JobLock` and directory channel rows of ADR 0044.
- **Depends on.** F12-5.
- **Acceptance.** Each row of the ADR 0044 table has an integration test that stops Valkey and checks the outcome.
- **Guard.** Those tests.

### F12-7 Catalogs and regions (ADR 0042)

- **Scope.** One `<service>_catalog` per service in `init.sql`, the `data` stack and the bootstrap Lambda; drop `catalog_owner` and `catalog_reader`. `REGIONS`, `SERVICE_REGION` and `IDENTITY_REGION` set by the `service` stack; `TENANT_MOVE_STRATEGY=batch` set explicitly and `TENANT_MOVE_TARGETS` left unset. Docs: `docs/local-development.md` and `docs/runbooks/service-operations.md` (per-service catalogs), the `data` section of `backend/infra/terraform/README.md`.
- **Depends on.** F12-6.
- **Acceptance.** `platform-flow:e2e` and `local-smoke` pass with per-service catalogs; a `service` stack test asserts the region variables and the absence of `TENANT_MOVE_TARGETS`.
- **Guard.** Those tests.

### F12-8 Database roles and IAM authentication (ADR 0041)

- **Scope.** Roles `<svc>_owner`, `<svc>_app` and `<svc>_reader`, created by the bootstrap Lambda with the passwords of ADR 0041. RDS Proxy `iam_auth = "REQUIRED"`; IAM database auth on the instance. `DatabaseTokenProvider` port and RDS signer adapter, `DB_AUTH`. `DB_*` names in Terraform equal to the code schema; `DB_CREDENTIALS` removed. Pinned-connection alarm. Docs: the `DB_CREDENTIALS` parts of `backend/infra/terraform/README.md`.
- **Depends on.** F12-7.
- **Acceptance.** An integration test shows `<svc>_app` cannot run DDL and sees only its tenant's rows; a `data` stack test asserts IAM auth and the roles.
- **Guard.** Those tests; a `service` stack test asserts that the environment's `DB_*` keys equal the keys of `databaseConfigSchema` (exported as JSON by the contract export).

### F12-9 Database deadlines and backups

- **Scope.** Per-shard `connectTimeoutMS` and `sources.get` inside the deadline in `AcrossShards` (general review 2.1). Backup retention 7, 14 and 35 days (ADR 0043).
- **Depends on.** F12-8.
- **Acceptance.** An integration test with an unreachable shard sees `AcrossShards` return within its deadline; a `data` stack test asserts the retention per environment.
- **Guard.** Those tests.

### F12-10 Secrets (ADR 0041, B20)

- **Scope.** Each owner stack creates its secrets with `ephemeral "random_password"` and `secret_string_wo`, including the OpenObserve root password; identity's signing-key container and the `identity:signing-keys` one-off task. `SECRETS_MAP` and the `SecretSource` port with `SecretsManagerSecretSource`, resolved by `LambdaBootstrap` before config validation. X-Origin-Verify accepts current and previous values. `WEB_ORIGINS` from `common.tfvars`, validated as a list of URL origins. A `config-coverage` script reads each service's config schema and the planned task environment and secrets, and fails on a required variable with no source; it writes `docs/runbooks/configuration.md` (variable, source, environments). Docs: `docs/runbooks/secret-rotation.md` (`_PREVIOUS` overlap instead of the HMAC cutover, proxy-managed database passwords, no `secrets` block) and `docs/runbooks/identity-key-rotation.md` (the `identity:signing-keys` task).
- **Depends on.** F12-9.
- **Acceptance.** `terraform test` shows no secret value in plan output; a Lambda test with LocalStack Secrets Manager starts identity from `SECRETS_MAP`; `config-coverage` passes for every service and environment; `WEB_ORIGINS=not-a-url` fails config validation.
- **Guard.** `config-coverage` in the CI `terraform` job, with a drift check on `configuration.md`.

### F12-11 Internal routing and authentication (ADR 0040, B19)

- **Scope.** Lattice service network and services in `platform`; listener rules, target groups and auth policies in `service`; `callees` in `topology.json`, extracted by the contract export from the callee list each service passes to `SignedInternalHttp`; `INTERNAL_API_BASE_URLS` built by the stack. `SigV4Service.VpcLattice`, `INTERNAL_API_AUTH`, `LatticeIdentityAuthenticator`, `INTERNAL_API_SHARED_SECRET_PREVIOUS`. `LambdaBootstrap` accepts the Lattice event (version 2.0) for `/internal/operations/*`. One SigV4 implementation: `SigV4Signer` on `@smithy/signature-v4` stays, and `ElastiCacheIamAuthTokenProvider` moves onto its `presign`.
- **Depends on.** F12-10.
- **Acceptance.** Unit tests of the authenticator (known role, unknown role, missing header); a `SigV4Signer` test that signs for `vpc-lattice-svcs` with `x-amz-content-sha256`; a `LambdaBootstrap` test that routes a Lattice 2.0 event to `InternalApiController`; the existing ElastiCache token tests pass unchanged on `presign`; a `service` stack test that the auth policy lists exactly the callers from `topology.json`; `local-smoke` still passes with HMAC.
- **Guard.** Those tests and the topology drift check, which now covers `callees`.

### F12-12 Runtime hardening for rolling deploys

- **Scope.** Shutdown order: the HTTP server drains before the `DataSource`s close (general review 2.7). SQS batches processed with visibility extension instead of serially under a fixed 30 s (2.7). Lambda consumer entry `lambda.consumer` and the `consumers` map wiring (ADR 0039).
- **Depends on.** F12-11.
- **Acceptance.** An integration test sends SIGTERM during in-flight requests and sees them complete; a test with a slow handler sees no redelivery within the batch; a `lambda.consumer` test with an SQS batch reports the failed message ids as partial failures; a `service` stack test that a queue in `consumers` has an event source mapping and is absent from the worker's queues.
- **Guard.** Those tests.

### F12-13 Edge and real time (ADR 0045)

- **Scope.** Real-time routes in the API distribution; ALB restricted to the CloudFront prefix list and `X-Origin-Verify`; `CloudFront-Viewer-Address` as client IP, `TRUST_PROXY_HOPS` removed; the regional real-time certificate and origin record in `platform`; CloudFront standard access logs to the log bucket; `HttpApplicationSetup` in the real-time app; cookie authenticator removed; SSE heartbeat 20 s. Docs: the real-time parts of `backend/infra/terraform/README.md`.
- **Depends on.** F12-12.
- **Acceptance.** `edge` and `platform` stack tests for the behaviours, the prefix list, the listener rule, the origin certificate and the access logs; a realtime test that rejects a spoofed `X-Forwarded-For`; `REALTIME_AUTH=cookie` fails config validation; a heartbeat test with a fake clock sees a frame every 20 s; a real-time app test sees the CORS and security headers of `HttpApplicationSetup`.
- **Guard.** Those tests.

### F12-14 Pipeline (ADR 0043)

- **Scope.** `deploy.yml` rewritten: `workflow_run` after CI, build once, digest promotion with the cross-account copy, the preview job, one `deploy` job per environment that plans and applies each stack in order from its own saved plan, the one-off tasks (`signing-keys`, `migrate`, `seed`), ECS stability checks, smoke at the end, and `rollback_to`. OIDC `job_workflow_ref` and permission boundary; a read-only PR plan role. Plan files written to the runner's temporary directory and deleted in an `always()` step. The workflow pinning test parses every workflow and requires a full commit SHA on every action. The pipeline reads the service list and runtimes from `service-base` outputs; `service-catalog.mjs` and `tfvars-block-reader.mjs` are removed. Runbook `docs/runbooks/deploy-and-rollback.md`. Docs: the deploy section of `backend/infra/terraform/README.md` (no runner in the VPC).
- **Depends on.** F12-13.
- **Acceptance.** `actionlint` passes; `deploy-aws.sh` and the pipeline scripts pass their tests in dry-run mode, including a run that stops on a destroy missing from the preview, and a `rollback_to` run that plans only the `service` stacks with the target commit's digests and skips `migrate`; a `global` stack test asserts the trust conditions, the boundary and that the PR plan role has no write action.
- **Guard.** `actionlint` and the pinning test in `ci-ok`.

### F12-15 Migration and contract checks (ADR 0043)

- **Scope.** A `migration-safety` check rejects destructive statements outside `MigrationPhase.Contract`. A `contract-compat` check compares the contract export with `main` and rejects removed versions still referenced in the topology.
- **Depends on.** F12-14.
- **Acceptance.** A fixture migration with `DROP COLUMN` fails `migration-safety`, and the same in a `Contract` migration passes; removing an event version still consumed fails `contract-compat`.
- **Guard.** `migration-safety` and `contract-compat` in `ci-ok`.

### F12-16 Front delivery

- **Scope.** `publish-web.sh` caching rules, no source maps, no `--delete`, a lifecycle rule; `API_BASE_URL` per environment. `mobile-release` environment, branch and tag restriction, failure without keystore. `AndroidManifest.xml` with `INTERNET` and `allowBackup="false"` (general review 2.10).
- **Depends on.** F12-15.
- **Acceptance.** Script tests assert the `Cache-Control` per file type; `flutter build appbundle --release` without keystore fails; the release manifest has the permission.
- **Guard.** The script tests and a manifest check in `check-structure`.

### F12-17 Observability and recovery minimum (ADR 0046)

- **Scope.** OTLP/HTTP from the OpenTelemetry SDK in each process straight to OpenObserve, in Fargate and Lambda, with head sampling per environment; OpenObserve reachable only from the VPC, through SSM port forwarding for operators. The alarm catalog of ADR 0046. HTTP spans without query strings (2.8). Runbook `restore-drill.md`. Docs: `docs/runbooks/service-operations.md` (no Collector in AWS).
- **Depends on.** F12-16.
- **Acceptance.** An exporter test against a local OTLP receiver sees spans sampled at `OTEL_TRACES_SAMPLER_ARG`; a `platform` stack test that OpenObserve admits only the VPC CIDR and has no public listener; `service` stack tests list the alarms; an observability test shows `token=` absent from span attributes.
- **Guard.** Those tests.

### F12-18 First deploy to `dev` (needs P1 to P5, P9)

- **Scope.** Follow `first-deploy.md` for `dev`: bootstrap, the first `global` apply, NS delegation; then `deploy.yml` for `dev` from `main`. Each failure the real apply finds is fixed in its own PR, with a test or check that would have caught it, merged before the deploy is retried.
- **Depends on.** F12-17 and the prerequisites.
- **Acceptance.** Definition of done item 3, with `tasks` on Lambda.
- **Guard.** `deploy.yml` on every merge to `main`.

### F12-19 Staging, rollback, drill and prod preview (needs P3, P4 and P6 for `staging`, P9 for `staging` and `prod`)

- **Scope.** Bootstrap `staging` and `prod` with `first-deploy.md`. Promote to `staging`, roll back and forward again, run the restore drill, produce the `prod` preview. Fixes follow the F12-18 rule.
- **Depends on.** F12-18.
- **Acceptance.** Definition of done items 4 to 7.
- **Guard.** A promotion is a `workflow_dispatch` of `deploy.yml` for a commit already deployed to `dev`; `deploy-smoke` runs at the end of every promotion and rollback.

### Carried items and audit findings per cycle

| Item                                                                                                                                                                     | Cycle                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| B17; base image digest and `.dockerignore` (general review 3)                                                                                                            | F12-1                                           |
| OIDC out of `platform`; ECR created by the CLI without lifecycle (3)                                                                                                     | F12-3                                           |
| B18; tfvars contradictions and real tfvars not planned (2.11); CI `terraform` filter (2.11)                                                                              | F12-4                                           |
| `NODE_ENV` safeguards (2.8); prod `fake` payment (2.11)                                                                                                                  | F12-5                                           |
| Silent `NullRoutingCache` (2.1); rate limiter without breaker (2.8); Valkey outage answers 401 in SSE (2.4)                                                              | F12-6                                           |
| Terraform catalog and region variables (2.2); `TENANT_MOVE_*` not set by Terraform                                                                                       | F12-7                                           |
| Fence locks versus RDS Proxy (2.1); rotation versus injected credentials (2.11)                                                                                          | F12-8                                           |
| `AcrossShards` without connect timeout (2.1)                                                                                                                             | F12-9                                           |
| B20; secrets of B19; `WEB_ORIGINS` (B19) and its URL validation (3)                                                                                                      | F12-10                                          |
| B19 routing; no SigV4 verifier on the server (2.7); two SigV4 implementations (3, 7)                                                                                     | F12-11                                          |
| Shutdown order (2.7); serial SQS batch (2.7)                                                                                                                             | F12-12                                          |
| Real-time ALB without CloudFront and WAF (2.11, 7); real-time app without `HttpApplicationSetup` and cookie mode (2.4); CloudFront without access logs (3)               | F12-13                                          |
| OIDC trust (2.11); plan and apply in one job, deploy before CI (2.11); `.tfplan` left on disk (3); workflow pinning test (3); `service-catalog.mjs` reimplements HCL (3) | F12-14                                          |
| Web caching (2.11); keystore and debug signing (2.11); Android manifest (2.10)                                                                                           | F12-16                                          |
| Unredacted query in HTTP spans (2.8)                                                                                                                                     | F12-17                                          |
| Group convention without `TENANT_MOVE_TARGETS` has only unit tests (wave 9)                                                                                              | F12-18: the `dev` deploy runs on the convention |

Closed before F12: `check-structure.mjs` runs in CI since cycle 2a (general review 2.11).

## 6. How the cycles run

- Each cycle runs with the [`phase-cycle`](../../.claude/workflows/phase-cycle.js) workflow on the pstack method of `CLAUDE.md`: an Opus builder, an independent Opus reviewer with the impact map of cycle 3, up to two correction rounds. The general merges with green checks and starts the next cycle.
- User approval points: the prerequisites; every bootstrap and first `global` apply (they create IAM roles); every `staging` and `prod` deploy through the environment reviewers.
- F12-1 to F12-17 never call AWS. A cycle that finds it needs AWS records the gap for F12-18 instead.

## 7. Backlog

Not in F12. Each item is checked against `main` before it is scheduled, because a correction cycle may have closed it.

| Item                                                                                                                  | Source                     |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Quota 403 without `metric`, `limit` and `used`; check that `publicDetails` now covers it                              | Wave 8                     |
| `tasks` rejects API keys, so service-account quotas do not apply                                                      | Wave 8                     |
| Invitation sign-up between two quota checks leaves an account without membership                                      | Wave 8                     |
| Load command for organization tenants created before the per-service directory                                        | Wave 9                     |
| `UnitRollbackError`; `AwsErrorTranslator` and `ValkeyErrorTranslator` not registered; optional `CursorCodec`          | Wave 3                     |
| Unlock epoch TTL, tenant reads on the primary, `password_resets` retention                                            | Wave 6                     |
| Ledger and delivery UPSERT, heartbeat `>` comparison, future `resumePoint`                                            | Wave 7                     |
| Log-level flag and `Api-Version` transformers: not built                                                              | Plan review m-8            |
| `@Endpoint` options `deprecated`, `flag`, `entitlement`, `signature`, `agreements`: added in the phase that uses each | Plan review m-9            |
| Per-operation internal authorization                                                                                  | ADR 0040                   |
| Second region: global indexes, cross-region writes, `auth:*` and bus propagation, cross-region calls and moves        | ADR 0042                   |
| `TENANT_MOVE_STRATEGY=logical` in AWS: a replication role with `BYPASSRLS`                                            | ADR 0041                   |
| `MoveShard` saga                                                                                                      | ARCHITECTURE               |
| OpenTelemetry Collector with tail sampling in AWS; a per-service OpenObserve ingestion user                           | ADR 0046                   |
| `IDENTITY_TOKEN_PEPPER` per-purpose subkeys with HKDF and a `kid`                                                     | General review 7, ADR 0041 |
| Store publishing (needs P7 and P8)                                                                                    | ADR 0045                   |
| APNs, FCM, VAPID and real payment provider secrets                                                                    | ADR 0041                   |
| General review items in sections 2.1 to 2.11, 3 and 7 not listed in section 5 and not closed by cycles 1a to 2b       | General review             |
| Executive summary in Claude Docs: refreshed when a stage closes                                                       | Plan review m-7            |

Closed since their hand-off, per ADR 0032: `tenant-directory.remove.v1` without a status check (now `TENANT_HAS_DATA`), the cleanup without pause (now `TENANT_MOVE_CLEANUP_PAUSE_MS`), `processed_messages` left in the source, the doubled logical-move budget, and `IDENTITY_REGION` validated only with `SERVICE_REGION` declared.
