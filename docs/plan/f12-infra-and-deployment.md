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
| 2   | What "F12 done" means            | Section 3: mocked tests and a LocalStack smoke in CI, plus real `dev` and `staging` deploys with smoke tests; prod is preview only, except the bootstrap and first `global` apply of P9                    | Mocks alone never caught B17 to B20                                               |
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
7. `deploy.yml` produces the `prod` preview (every stack planned against the `prod` state) for review. Applying `prod` is the user's choice and outside F12, except the bootstrap and first `global` apply of P9.

Before the prerequisites exist, items 1 and 2 are reachable; items 3 to 7 wait for them.

## 4. Prerequisites

| #   | Prerequisite                                                                                                                                                                                                                                                                      | Owner                                        | Needed by                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| P1  | AWS accounts for `dev`, `staging` and `prod` (one per environment), and an IAM Identity Center admin profile per account on the build machine (`aws sso login --profile <env>-admin`). The agent uses the short-lived session through `AWS_PROFILE`; no access key is stored      | User                                         | F12-20 (`dev`), F12-21 (`staging`, `prod`)                                     |
| P2  | AWS region and region code, if not `us-east-1` and `us`                                                                                                                                                                                                                           | User                                         | F12-20                                                                         |
| P3  | A domain whose apex public hosted zone lives in the `prod` account (ADR 0042). After each `global` apply of `dev` and `staging`, the user adds the NS records it prints for `dev.<domain>` and `staging.<domain>` to the apex zone                                                | User                                         | F12-20 (`dev`), F12-21 (`staging`)                                             |
| P4  | GitHub environments `dev`, `staging`, `prod` and `mobile-release`, with reviewers on `staging`, `prod` and `mobile-release`; the unreviewed `dev-plan`, `staging-plan` and `prod-plan` for the preview (ADR 0043); and the variables listed by `deploy.yml` (account ids, region) | User                                         | F12-20 (`dev`), F12-21 (`staging` reviewers, `prod` variables and `prod-plan`) |
| P5  | `main` branch protection requiring `ci-ok`                                                                                                                                                                                                                                        | User                                         | F12-20                                                                         |
| P6  | SES production access in the `staging` account, and the alarm email                                                                                                                                                                                                               | User                                         | F12-21                                                                         |
| P7  | Android upload keystore and its passwords in `mobile-release`                                                                                                                                                                                                                     | User                                         | Store publishing (backlog)                                                     |
| P8  | Apple and Google Play developer accounts                                                                                                                                                                                                                                          | User                                         | Store publishing (backlog)                                                     |
| P9  | Bootstrap per account: run `bootstrap-account.sh` (state bucket) and the first `global` apply, following `first-deploy.md` (both built in F12-3)                                                                                                                                  | Agent, with the P1 session, once per account | F12-20 (`dev`), F12-21 (`staging`, `prod`)                                     |

F12-1 to F12-19 need none of the above.

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
- **Acceptance.** `global` stack tests with mocked providers assert the repository policy principals, the lifecycle rule, the bucket policy, the environment hosted zone in `dev` and `staging`, the apex data source in `prod`, and the certificate in `us-east-1` validated by DNS; `bootstrap-account.sh` passes shellcheck and a dry-run test that prints the calls it would make.
- **Guard.** Those tests in the CI `terraform` job.

### F12-4 Consistent Terraform (B18 and the tfvars)

- **Scope.** B18: target group names with `name_prefix` and `create_before_destroy`, and a test with the real prefix of each environment. `environments/<env>/common.tfvars` (ADR 0042) passed by `deploy-aws.sh`. Remove `fargate_api_enabled`; listener priorities computed (ADR 0039). Worker `min_count = 1`. `tasks` API on Lambda in `dev`. A `service` stack validation that rejects route prefixes under `/internal`. `tf-validate.mjs` runs `terraform test` against each environment's real tfvars with mocked providers. The CI `terraform` filter adds `.github/workflows/**` and `.nvmrc`. Docs: `backend/infra/terraform/README.md` (no `fargate_api_enabled`).
- **Depends on.** F12-3.
- **Acceptance.** `node backend/infra/scripts/tf-validate.mjs` passes with the real tfvars of `dev`, `staging` and `prod`; reverting the B18 fix makes the notifications test fail; a `service` stack test rejects a route prefix under `/internal`; a `service` stack test asserts unique computed listener priorities and worker `min_count = 1`.
- **Guard.** The per-environment `terraform test` runs in the CI `terraform` job.

### F12-5 Service stack split (ADR 0043)

- **Scope.** The `service` stack split into `service-base` (task, execution and function roles, log groups, security groups, the shared environment with the `DB_*` variables, and `one_off_task`) and `service` (runtime), which reads `service-base` through remote state. State keys `<region>/services/<service>/base/terraform.tfstate` and `<region>/services/<service>/terraform.tfstate`; values in `environments/<env>/services/<service>/base/` and `environments/<env>/services/<service>/`. `deploy-aws.sh` applies `service-base` before `service`. Later cycles add the region variables (F12-8), the secrets (F12-11) and `INTERNAL_API_BASE_URLS` (F12-12) to `service-base`. Docs: `backend/infra/terraform/README.md` (the two service stacks).
- **Depends on.** F12-4.
- **Acceptance.** A `service` stack test reads `service-base` outputs from a mocked remote state; a `service-base` test asserts that `one_off_task` has the cluster, subnets, security group, roles and log group, and that `one_off_task.environment` carries the `DB_*` keys and equals the environment `service` uses.
- **Guard.** Those tests in the CI `terraform` job.

### F12-6 Configuration safeguards and providers (ADR 0046)

- **Scope.** `DEPLOY_ENVIRONMENT` replaces `NODE_ENV` as the safeguard source. The provider rules of ADR 0046: `dev` allows `BILLING_PAYMENT_PROVIDER=fake` and `NOTIFICATIONS_PUSH_SENDER=memory`; `staging` and `prod` reject every `fake`, `console`, `memory` and `smtp` adapter. New `none` payment provider and `none` push sender. `IDENTITY_SMOKE_ACCOUNT` rejected in `prod`. The `dev`, `staging` and `prod` tfvars updated.
- **Depends on.** F12-5.
- **Acceptance.** Starting identity with `DEPLOY_ENVIRONMENT=prod` and `IDENTITY_MAILER=console` fails; billing with `none` closes a period and leaves the invoice `Issued`; notifications with the `none` push sender delivers to the inbox and email only.
- **Guard.** A config test per service that loads its `staging` and `prod` tfvars environment and rejects any fake.

### F12-7 Valkey failure policy (ADR 0044)

- **Scope.** Valkey required outside `local`; no silent `NullRoutingCache` or in-process directory channel. Fail-closed checks and 503 instead of 401 in real time. Readiness without Valkey. Deadline and circuit breaker on every Valkey call, including the rate limiter. The `JobLock` and directory channel rows of ADR 0044.
- **Depends on.** F12-6.
- **Acceptance.** Each row of the ADR 0044 table has an integration test that stops Valkey and checks the outcome; with Valkey stopped, `HealthRoute.Ready` stays ready and reports Valkey as `degraded`.
- **Guard.** Those tests.

### F12-8 Catalogs and regions (ADR 0042)

- **Scope.** One `<service>_catalog` per service in `init.sql`, the `data` stack and the bootstrap Lambda; drop `catalog_owner` and `catalog_reader`. `REGIONS`, `SERVICE_REGION` and `IDENTITY_REGION` set in the `service-base` shared environment; `TENANT_MOVE_STRATEGY=batch` set explicitly and `TENANT_MOVE_TARGETS` left unset. Docs: `docs/local-development.md` and `docs/runbooks/service-operations.md` (per-service catalogs), the `data` section of `backend/infra/terraform/README.md`.
- **Depends on.** F12-7.
- **Acceptance.** `platform-flow:e2e` and `local-smoke` pass with per-service catalogs; a `data` stack test asserts one catalog database per service; a `service-base` stack test asserts the region keys in `one_off_task.environment` and the absence of `TENANT_MOVE_TARGETS`.
- **Guard.** Those tests.

### F12-9 Database roles and IAM authentication (ADR 0041)

- **Scope.** Roles `<svc>_owner`, `<svc>_app` and `<svc>_reader`, created by the bootstrap Lambda with the passwords of ADR 0041. RDS Proxy `iam_auth = "REQUIRED"`; IAM database auth on the instance. `DatabaseTokenProvider` port and RDS signer adapter, `DB_AUTH`. `DB_*` names in Terraform equal to the code schema; `DB_CREDENTIALS` removed. Pinned-connection alarm. Docs: the `DB_CREDENTIALS` parts of `backend/infra/terraform/README.md`.
- **Depends on.** F12-8.
- **Acceptance.** An integration test shows `<svc>_app` cannot run DDL and sees only its tenant's rows; a `data` stack test asserts IAM auth, the roles and the pinned-connection alarm; a pool test with `DB_AUTH=iam` and a fake signer sees a fresh token on each new connection.
- **Guard.** Those tests; a `service-base` stack test asserts that the shared environment's `DB_*` keys equal the keys of `databaseConfigSchema` (exported as JSON by the contract export).

### F12-10 Database deadlines and backups

- **Scope.** Per-shard `connectTimeoutMS` and `sources.get` inside the deadline in `AcrossShards` (general review 2.1). Backup retention 7, 14 and 35 days (ADR 0043).
- **Depends on.** F12-9.
- **Acceptance.** An integration test with an unreachable shard sees `AcrossShards` return within its deadline; a `data` stack test asserts the retention per environment.
- **Guard.** Those tests.

### F12-11 Secrets (ADR 0041, B20)

- **Scope.** Each owner stack creates its secrets with `ephemeral "random_password"` and `secret_string_wo`, including the OpenObserve root password; identity's signing-key container and the `identity:signing-keys` one-off task; identity's empty `SMOKE_ACCOUNT` container outside `prod`, written only by the deploy role and read by the deploy role and the `seed` execution role (ADR 0043). `SECRETS_MAP` and the `SecretSource` port with `SecretsManagerSecretSource`, resolved by `LambdaBootstrap` before config validation. X-Origin-Verify accepts current and previous values. `WEB_ORIGINS` from `common.tfvars`, validated as a list of URL origins. Docs: `docs/runbooks/secret-rotation.md` (`_PREVIOUS` overlap instead of the HMAC cutover, proxy-managed database passwords, no `secrets` block) and `docs/runbooks/identity-key-rotation.md` (the `identity:signing-keys` task).
- **Depends on.** F12-10.
- **Acceptance.** `terraform test` shows no secret value in plan output; a Lambda test with LocalStack Secrets Manager starts identity from `SECRETS_MAP`; `WEB_ORIGINS=not-a-url` fails config validation; an authorizer test accepts the current and previous X-Origin-Verify values and rejects any other; the `identity:signing-keys` task fills an empty container and leaves a filled one unchanged; a `service-base` test asserts `SMOKE_ACCOUNT` in `dev` and `staging`, its absence in `prod`, and that only the deploy role may write it.
- **Guard.** Those tests, the stack tests in the CI `terraform` job.

### F12-12 Internal routing and authentication (ADR 0040, B19)

- **Scope.** Lattice service network and services in `platform`; listener rules, target groups and auth policies in `service`; `callees` in `topology.json`, extracted by the contract export from the callee list each service passes to `SignedInternalHttp`; `INTERNAL_API_BASE_URLS` built by `service-base`. `SigV4Service.VpcLattice`, `INTERNAL_API_AUTH`, `LatticeIdentityAuthenticator`, `INTERNAL_API_SHARED_SECRET_PREVIOUS`. `LambdaBootstrap` accepts the Lattice event (version 2.0) for `/internal/operations/*`. One SigV4 implementation: `SigV4Signer` on `@smithy/signature-v4` stays, and `ElastiCacheIamAuthTokenProvider` moves onto its `presign`.
- **Depends on.** F12-11.
- **Acceptance.** Unit tests of the authenticator (known role, unknown role, missing header); a `SigV4Signer` test that signs for `vpc-lattice-svcs` with `x-amz-content-sha256`; a `LambdaBootstrap` test that routes a Lattice 2.0 event to `InternalApiController`; the existing ElastiCache token tests pass unchanged on `presign`; a `service` stack test that the auth policy lists exactly the role name patterns of the callers from `topology.json`; `local-smoke` still passes with HMAC.
- **Acceptance, wiring.** A `service-base` test that `INTERNAL_API_BASE_URLS` holds exactly the callees' entries; a `platform` stack test for the Lattice service network with one service per catalog entry; an HMAC verifier test that accepts `INTERNAL_API_SHARED_SECRET_PREVIOUS`.
- **Guard.** Those tests and the topology drift check, which now covers `callees`.

### F12-13 Configuration coverage

- **Scope.** A `config-coverage` script reads each service's config schema and the planned `service-base` and `service` environment and secrets, and fails on a required variable with no source; it writes `docs/runbooks/configuration.md` (variable, source, environments).
- **Depends on.** F12-12.
- **Acceptance.** `config-coverage` passes for every service and environment; a fixture plan without the source of a required variable fails it.
- **Guard.** `config-coverage` in the CI `terraform` job, with a drift check on `configuration.md`.

### F12-14 Runtime hardening for rolling deploys

- **Scope.** Shutdown order: the HTTP server drains before the `DataSource`s close (general review 2.7). SQS batches processed with visibility extension instead of serially under a fixed 30 s (2.7). Lambda consumer entry `lambda.consumer` and the `consumers` map wiring (ADR 0039).
- **Depends on.** F12-13.
- **Acceptance.** An integration test sends SIGTERM during in-flight requests and sees them complete; a test with a slow handler sees no redelivery within the batch; a `lambda.consumer` test with an SQS batch reports the failed message ids as partial failures; a `service` stack test that a queue in `consumers` has an event source mapping and is absent from the worker's queues.
- **Guard.** Those tests.

### F12-15 Edge and real time (ADR 0045)

- **Scope.** Real-time routes in the API distribution; ALB restricted to the CloudFront prefix list and `X-Origin-Verify`; `CloudFront-Viewer-Address` as client IP, `TRUST_PROXY_HOPS` removed; the regional real-time certificate and origin record in `platform`; CloudFront standard access logs to the log bucket; `HttpApplicationSetup` in the real-time app; cookie authenticator removed; SSE heartbeat 20 s. Docs: the real-time parts of `backend/infra/terraform/README.md`.
- **Depends on.** F12-14.
- **Acceptance.** `edge` and `platform` stack tests for the behaviours, the prefix list, the listener rule, the origin certificate and the access logs; a realtime test that rejects a spoofed `X-Forwarded-For`; `REALTIME_AUTH=cookie` fails config validation; a heartbeat test with a fake clock sees a frame every 20 s; a real-time app test sees the CORS and security headers of `HttpApplicationSetup`.
- **Guard.** Those tests.

### F12-16 Pipeline (ADR 0043)

- **Scope.** `deploy.yml` rewritten: `workflow_run` after CI, build once with the `dev` deploy role, digest promotion with the cross-account copy, the preview job in `<env>-plan`, one `deploy` job per environment that plans and applies each stack in order from its own saved plan, fresh smoke credentials written to `SMOKE_ACCOUNT` before `seed`, the one-off tasks (`signing-keys`, `migrate`, `seed`), ECS stability checks, smoke at the end, and `rollback_to`. `plan-pr.yml` for pull requests. The three OIDC trusts of ADR 0043 (deploy, read-only plan, PR plan) and the permission boundary. Plan files written to the runner's temporary directory and deleted in an `always()` step. The workflow pinning test parses every workflow and requires a full commit SHA on every action. The pipeline takes the service list and order from the directory names under `environments/<env>/services/`, and each service's runtime and one-off settings from its `service-base` outputs after its apply; `service-catalog.mjs` and `tfvars-block-reader.mjs` are removed. Runbook `docs/runbooks/deploy-and-rollback.md`. Docs: the deploy section of `backend/infra/terraform/README.md` (no runner in the VPC).
- **Depends on.** F12-15.
- **Acceptance.** `actionlint` passes; `deploy-aws.sh` and the pipeline scripts pass their tests in dry-run mode, including a run with empty state that orders `service-base`, `signing-keys`, `migrate` and `service` for identity, a run that stops on a destroy missing from the preview, a run that stops on a digest mismatch before any apply, and a `rollback_to` run that plans only the `service` stacks with the target commit's digests and skips `migrate` and `seed`; a `global` stack test asserts the three trusts, the boundary and that the two plan roles have no write action.
- **Acceptance, safety.** The dry run writes `SMOKE_ACCOUNT` before `seed`; plan files are removed after a failed step; a workflow test asserts that `plan-pr.yml` requests only the PR plan role, skips fork PRs and never plans `edge`.
- **Guard.** `actionlint` and the pinning test in `ci-ok`.

### F12-17 Migration and contract checks (ADR 0043)

- **Scope.** A `migration-safety` check rejects destructive statements outside `MigrationPhase.Contract`. A `contract-compat` check compares the contract export with `main` and rejects removed versions still referenced in the topology.
- **Depends on.** F12-16.
- **Acceptance.** A fixture migration with `DROP COLUMN` fails `migration-safety`, and the same in a `Contract` migration passes; removing an event version still consumed fails `contract-compat`.
- **Guard.** `migration-safety` and `contract-compat` in `ci-ok`.

### F12-18 Front delivery

- **Scope.** `publish-web.sh` caching rules, no source maps, no `--delete`, a lifecycle rule; `API_BASE_URL` per environment. `mobile-release` environment, branch and tag restriction, failure without keystore. `AndroidManifest.xml` with `INTERNET` and `allowBackup="false"` (general review 2.10).
- **Depends on.** F12-17.
- **Acceptance.** Script tests assert the `Cache-Control` per file type and that each environment's build gets its own `API_BASE_URL`; a workflow test asserts that `mobile-release.yml` runs in the `mobile-release` environment only from `main` and release tags; `flutter build appbundle --release` without keystore fails; the release manifest has the permission.
- **Guard.** The script tests and a manifest check in `check-structure`.

### F12-19 Observability and recovery minimum (ADR 0046)

- **Scope.** OTLP/HTTP from the OpenTelemetry SDK in each process straight to OpenObserve, in Fargate and Lambda, with head sampling per environment; OpenObserve reachable only from the VPC, through SSM port forwarding for operators. The alarm catalog of ADR 0046. HTTP spans without query strings (2.8). Runbook `restore-drill.md`. Docs: `docs/runbooks/service-operations.md` (no Collector in AWS).
- **Depends on.** F12-18.
- **Acceptance.** An exporter test against a local OTLP receiver sees spans sampled at `OTEL_TRACES_SAMPLER_ARG`; a `platform` stack test that OpenObserve admits only the VPC CIDR and has no public listener; `service` stack tests list the alarms; an observability test shows `token=` absent from span attributes.
- **Guard.** Those tests.

### F12-20 First deploy to `dev` (needs P1 to P5, P9)

- **Scope.** Follow `first-deploy.md` for `dev`: bootstrap, the first `global` apply, NS delegation; then `deploy.yml` for `dev` from `main`. Each failure the real apply finds is fixed in its own PR, with a test or check that would have caught it, merged before the deploy is retried.
- **Depends on.** F12-19 and the prerequisites.
- **Acceptance.** Definition of done item 3, with `tasks` on Lambda.
- **Guard.** `deploy.yml` on every merge to `main`.

### F12-21 Staging, rollback, drill and prod preview (needs P1, P4 and P9 for `staging` and `prod`; P3 and P6 for `staging`)

- **Scope.** Bootstrap `staging` and `prod` with `first-deploy.md`. Promote to `staging`, roll back and forward again, run the restore drill, produce the `prod` preview. Fixes follow the F12-20 rule.
- **Depends on.** F12-20.
- **Acceptance.** Definition of done items 4 to 7.
- **Guard.** A promotion is a `workflow_dispatch` of `deploy.yml` for a commit already deployed to `dev`; `deploy-smoke` runs at the end of every promotion and rollback.

### Carried items and audit findings per cycle

| Item                                                                                                                                                                     | Cycle                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| B17; base image digest and `.dockerignore` (general review 3)                                                                                                            | F12-1                                           |
| OIDC out of `platform`; ECR created by the CLI without lifecycle (3)                                                                                                     | F12-3                                           |
| B18; tfvars contradictions and real tfvars not planned (2.11); CI `terraform` filter (2.11)                                                                              | F12-4                                           |
| `NODE_ENV` safeguards (2.8); prod `fake` payment (2.11)                                                                                                                  | F12-6                                           |
| Silent `NullRoutingCache` (2.1); rate limiter without breaker (2.8); Valkey outage answers 401 in SSE (2.4)                                                              | F12-7                                           |
| Terraform catalog and region variables (2.2); `TENANT_MOVE_*` not set by Terraform                                                                                       | F12-8                                           |
| Fence locks versus RDS Proxy (2.1); rotation versus injected credentials (2.11)                                                                                          | F12-9                                           |
| `AcrossShards` without connect timeout (2.1)                                                                                                                             | F12-10                                          |
| B20; secrets of B19; `WEB_ORIGINS` (B19) and its URL validation (3); X-Origin-Verify rotation (audit BE-32)                                                              | F12-11                                          |
| B19 routing; no SigV4 verifier on the server (2.7); two SigV4 implementations (3, 7)                                                                                     | F12-12                                          |
| Shutdown order (2.7); serial SQS batch (2.7)                                                                                                                             | F12-14                                          |
| Real-time ALB without CloudFront and WAF (2.11, 7); real-time app without `HttpApplicationSetup` and cookie mode (2.4); CloudFront without access logs (3)               | F12-15                                          |
| OIDC trust (2.11); plan and apply in one job, deploy before CI (2.11); `.tfplan` left on disk (3); workflow pinning test (3); `service-catalog.mjs` reimplements HCL (3) | F12-16                                          |
| Web caching (2.11); keystore and debug signing (2.11); Android manifest (2.10)                                                                                           | F12-18                                          |
| Unredacted query in HTTP spans (2.8)                                                                                                                                     | F12-19                                          |
| Group convention without `TENANT_MOVE_TARGETS` has only unit tests (wave 9)                                                                                              | F12-20: the `dev` deploy runs on the convention |

Closed before F12: `check-structure.mjs` runs in CI since cycle 2a (general review 2.11).

## 6. How the cycles run

- Each cycle runs with the [`phase-cycle`](../../.claude/workflows/phase-cycle.js) workflow on the pstack method of `CLAUDE.md`: an Opus builder, an independent Opus reviewer with the impact map of cycle 3, up to two correction rounds. The general merges with green checks and starts the next cycle.
- User approval points: the prerequisites; every bootstrap and first `global` apply (they create IAM roles); every `staging` and `prod` deploy through the environment reviewers.
- F12-1 to F12-19 never call AWS. A cycle that finds it needs AWS records the gap for F12-20 instead.

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

Closed since their hand-off, per ADR 0032: `tenant-directory.remove.v1` without a status check (now `TENANT_HAS_DATA`), the cleanup without pause (now `TENANT_MOVE_CLEANUP_PAUSE_MS`), `processed_messages` left in the source, the doubled logical-move budget, and `IDENTITY_REGION` validated only with `SERVICE_REGION` declared. Closed on `main` from the 2026-11-14 quality audit: BE-30 (`check_vendor.py` compares `vendor/` with `requirements.txt`), BE-31 (the bootstrap Lambda verifies the RDS certificate) and BE-33 (Lambda on `nodejs24.x`, with a precondition on the `.nvmrc` major).
