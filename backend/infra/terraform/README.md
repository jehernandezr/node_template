# Terraform infrastructure

AWS infrastructure for the platform, organized in modules, stacks with their own state and per-environment values. The decision is in [ADR 0020](../../../docs/adr/0020-terraform-stacks-and-runtime-per-service.md).

## Structure

```
backend/infra/
├── terraform/
│   ├── modules/             Reusable pieces, without backend or provider (CMKs come from kms-key)
│   ├── stacks/              Roots with their own state
│   │   ├── global/          One per account: GitHub OIDC, ECR, artifacts bucket, hosted zone and CloudFront certificate
│   │   ├── network/         VPC, subnets, NAT, endpoints and flow logs (ADR 0016)
│   │   ├── platform/        Alarms and budget, ECS, OpenObserve, HTTP API, ALB, files, SES and the compute logs CMK
│   │   ├── data/            RDS with per-shard and catalog databases, RDS Proxy, replicas and Valkey
│   │   ├── messaging/       Topics, queues and DLQs from topology.json and the SES events queue
│   │   ├── edge/            CloudFront with WAF and DNS
│   │   └── service/         One microservice: instantiated once per service
│   ├── environments/        <environment>/<stack>/{backend.tfvars,terraform.tfvars}
│   │   └── <environment>/services/<service>/   Values for each service
│   ├── examples/            A minimal usage of each module, validated in CI
│   ├── topology.json        Topology exported by contracts-export (build-topology.ts)
│   ├── .terraform-version   Terraform version used in CI
│   ├── .tflint-version      tflint version used in CI
│   └── .tflint.hcl          tflint rules (includes the AWS ruleset)
├── scripts/                 bootstrap-account.sh, deploy-aws.sh, local.sh, tf-validate.mjs, check_vendor.py and fetch-rds-ca-bundle.sh
└── local/                   PostgreSQL init.sql, LocalStack and the OpenTelemetry Collector
```

Each stack has:

- `config.tf`: versions, provider and an empty `backend "s3" {}`. The bucket and key come from `backend.tfvars`.
- `variables_common.tf`: `region`, `environment`, `name_prefix`, `aws_endpoint_url` and tags. It is identical in every stack; `tf-validate.mjs` fails if it differs.
- `remote_state.tf`: reads the previous stacks from `<region>/<stack>/terraform.tfstate`. `global` reads none.
- `tests/`: `terraform test` tests with mocked providers, without AWS.

## Stacks and order

| Order | Stack       | Reads                              | Environments              |
| ----- | ----------- | ---------------------------------- | ------------------------- |
| 0     | `global`    |                                    | dev, staging, prod        |
| 1     | `network`   |                                    | dev, staging, prod        |
| 2     | `platform`  | network                            | local, dev, staging, prod |
| 3     | `data`      | network, platform                  | dev, staging, prod        |
| 4     | `messaging` | platform                           | local, dev, staging, prod |
| 5     | `edge`      | platform                           | dev, staging, prod        |
| 6     | `service`   | network, platform, data, messaging | dev, staging, prod        |

Each region has its own states with the same code: the region is part of the key. `global` is the exception: one per account, with state key `global/terraform.tfstate`, applied first and by hand on a new account ([first deploy](../../../docs/runbooks/first-deploy.md)). `deploy-aws.sh plan global` and `apply global` run it; `all` leaves it out.

## Global stack

What is unique per account ([ADR 0042](../../../docs/adr/0042-region-and-catalog-model.md), [ADR 0043](../../../docs/adr/0043-deploy-migrations-and-rollback.md)):

- The GitHub OIDC provider and the deploy, publish and web roles of `modules/oidc-github`. `oidc_existing_provider_arn` reuses a provider the account already has.
- One ECR repository `<name_prefix>/<service>` per entry of `services`, which lists the directories under `environments/<env>/services`. Tags are immutable; untagged images expire after 7 days and only the last 50 `sha-*` images are kept.
- The `<name_prefix>-artifacts` bucket for the Lambda packages (`lambda/<service>/<commit>.zip`) and the mobile builds: versioned, encrypted with its CMK, private and TLS-only.
- In `dev`, `promotion_account_ids` (`staging` and `prod` account ids) gives the deploy role `<project>-<env>-github-deploy` of each one a repository policy to pull the images, and a bucket and key policy to read `lambda/*`. Add an account only after its `global` stack exists.
- The public hosted zone: `dev` and `staging` create `<env>.<domain>` and output its name servers for the delegation from the apex zone; `prod` reads the apex zone `<domain>`, which lives in its account.
- The CloudFront certificate in `us-east-1` for `api.<zone>` and `app.<zone>`, validated by DNS in that zone.

The state bucket itself comes before Terraform: `backend/infra/scripts/bootstrap-account.sh <env>` creates the bucket of `environments/<env>/global/backend.tfvars`, versioned, encrypted with KMS and TLS-only, and can run again without changes. Every stack uses S3 native locking (`use_lockfile`).

## Services

A service is an instance of the `service` stack with its own state. To add one, copy `stacks/service/example.tfvars` to `environments/<environment>/services/<service>/terraform.tfvars` and create a `backend.tfvars` next to it with `key = "<region>/services/<service>/terraform.tfstate"`. Also:

- Add it to `db_services` and `valkey_services` in the `terraform.tfvars` of the `data` stack.
- Declare its topics and queues in the topology. The publish, send and consume permissions come from `producers` and `consumer` in `topology.json`; they are not repeated in the `tfvars`.

Parts of a service:

- `api`: `runtime = "lambda"` (a function with `lambda.ts` behind API Gateway HTTP) or `"fargate"` (a container with `main.ts` behind the internal ALB, through the VPC link; requires `fargate_api_enabled = true` in `platform` and a unique `listener_rule_priority`). Both enter through the shared HTTP API, behind CloudFront and its WAF. Each prefix in `route_prefixes` creates `ANY <prefix>` and `ANY <prefix>/{proxy+}`.
- `realtime`: Socket.IO and SSE, always on Fargate behind the public ALB from `platform` (`realtime_alb_certificate_arn`).
- `workers`: Fargate with `worker.ts`, scales from zero on the depth of its queue.
- `consumers`: Lambdas that consume a queue, with partial batch failures.

Permissions per part (least privilege): the API, the workers and the consumers publish and send according to `producers` in the topology; realtime only if `realtime.publish = true`. Each worker consumes only its queue and each consumer only its own (granted by the `service-lambda` module); the API and realtime do not consume. `files_access` and `ses_send` are requested per part (`api.files_access`, `workers.<x>.ses_send`...). `valkey_access` and `database_access` apply to the whole service, as does `task_policies`.

Environment variables: they are the contract with the `@platform/*` configuration schemas, and `backend/.env.example` uses the same names. `tests/service.tftest.hcl` pins the exact list, so a change on one side breaks the test.

| Variable                                                                        | When                     | Content                                                                                                 |
| ------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `SERVICE_NAME`, `DEPLOY_ENVIRONMENT`, `MESSAGING_NAME_PREFIX`, `AWS_ACCOUNT_ID` | always                   | Service, environment, topic and queue prefix, and account (to build ARNs without STS).                  |
| `AWS_REGION`                                                                    | Fargate                  | Region. In Lambda the runtime sets it.                                                                  |
| `DB_PROXY_HOST`, `DB_READER_HOSTS`, `DB_PORT`, `DB_DATABASES`                   | `database_access`        | RDS Proxy, comma-separated replicas, port and JSON with `shards` and `catalog`.                         |
| `DB_CREDENTIALS` / `DB_SECRET_ARN`                                              | `database_access`        | Fargate receives the secret (JSON with `username` and `password`) through `valueFrom`; Lambda, its ARN. |
| `VALKEY_HOST`, `VALKEY_PORT`, `VALKEY_TLS`, `VALKEY_USER`                       | `valkey_access`          | Serverless endpoint, TLS (`true`) and the service's IAM user.                                           |
| `VALKEY_AUTH`, `VALKEY_CACHE_NAME`                                              | `valkey_access`          | `iam-serverless`: the client signs an IAM token (SigV4, 15 minutes) for the `VALKEY_CACHE_NAME` cache.  |
| `VALKEY_KEY_PREFIX`                                                             | `valkey_access`          | Service name. The adapters write `<prefix>:...` in keys and channels, the only thing the ACL allows.    |
| `FILES_BUCKET`                                                                  | `files_access` of a part | Files bucket.                                                                                           |
| `QUEUE_URL`                                                                     | workers                  | URL of its queue. The worker polls only that contract queue; without it, every queue of the contract.   |

`environment_variables` adds custom variables, without being able to replace the ones in the table. The pipeline passes the artifacts with `TF_VAR_image` and `TF_VAR_lambda_package`. Lambdas use the runtime of the major version in `.nvmrc` (`nodejs24.x`); `service-lambda` rejects any other in the plan.

## Data

- One RDS PostgreSQL 17 instance per region. The bootstrap (a Lambda in the VPC) creates one role per service with its rotated secret, one database per shard (`<service>_shard_<n>`, owned by the service) and the `catalog` database (owned by `catalog_owner`), all with the `vector` extension, same as `backend/infra/local/postgres/init.sql`. `catalog = "owner"` makes the service a member of `catalog_owner` (it migrates the catalog with `SET ROLE catalog_owner`) and `"read"`, of `catalog_reader`. Removing a database from the list does not delete it.
- Writes go through RDS Proxy. Reads go directly to the replicas: outside Aurora, RDS Proxy only supports the writer instance. The replicas have their own security group.
- The bootstrap Lambda loads its dependencies from `vendor/` (Lambda only puts `/var/task` on `sys.path`). The versions are in `requirements.txt`, which OSV-Scanner and Renovate also read. CI runs `backend/infra/scripts/check_vendor.py`, which fails if `vendor/` does not have exactly those versions; a Renovate bump needs `vendor/` regenerated with the command in the header of `requirements.txt`.
- The bootstrap connects as the master user and creates roles with passwords, so it verifies the RDS certificate (chain and name) with `rds-ca-bundle.pem`, the public AWS bundle next to the handler. `backend/infra/scripts/fetch-rds-ca-bundle.sh` downloads it; it is committed to git and renewed when AWS publishes new CAs. Without it, the bootstrap refuses to connect and the `data` apply fails at the invocation.
- Rotation uses the official AWS function with `kmsKeyArn`, to decrypt the secrets encrypted with the CMK.
- PostgreSQL, bootstrap and rotation logs with retention (`log_retention_days`) and CMK.
- Valkey 8 serverless (the Bloom `BF.*` commands arrive in 8.1): one IAM user per service with ACL `on ~<service>:* &<service>:* +@all -@dangerous`. The adapters require the `VALKEY_KEY_PREFIX` prefix and write `<service>:...` in keys and channels. `valkey_acl_overrides` allows a different, reviewed ACL.
- Services only go out over HTTPS. The clients security group (`clients_security_group_id`) opens the exact egress to RDS Proxy, the replicas, Valkey and OpenObserve, and it is the only source those destinations accept.

## Messaging topology

The `messaging` stack reads `topology.json`, which `backend/tools/contracts-export` exports and CI verifies (`contracts-export:check`). Its contract:

- `topics`: `name`, `fifo` and, optionally, `owner` and `producers`.
- `queues`: `name`, `fifo`, `visibilityTimeoutSeconds`, `maxAttempts`, `dlq` (`name`, `maxReceiveCount`, `retentionSeconds`), `subscriptions` (`topic`, `filterTypes`) and, optionally, `consumer` and `producers`.
- `routes`: `type`, `kind` (`event` or `command`), `target` and `targetKind` (`topic` or `queue`).

Subscription filters read the `type` field of the CloudEvents body; an empty list means no filter. Terraform validates that every subscription and every route points to something declared, that `retentionSeconds` does not exceed 14 days and that the final names do not exceed 80 characters.

## Public entry

- `platform` creates the HTTP API with an authorizer that requires `X-Origin-Verify`. The value is generated without going through the `platform` state and is stored in Secrets Manager; `edge` reads it and sends it from CloudFront, so it ends up in the `edge` state (a CloudFront origin header does not accept ephemeral values). That is why the state buckets are encrypted and access-restricted.
- Rotation without downtime: bump `origin_verify_secret_version` of the `http-api` module, apply `platform`, wait at least 5 minutes and apply `edge`. The previous value moves to `AWSPREVIOUS` and the authorizer accepts both; it also reloads the secret every 5 minutes, so no warm container keeps an old value. Do not rotate again before applying `edge`.
- `edge` creates CloudFront with WAF for the web (`web_aliases`) and the API (`api_aliases`). Toward API Gateway it does not forward the client's `Host` (policy `AllViewerExceptHostHeader`), but it does forward the geolocation headers.
- Realtime: the public ALB is reached directly, with `realtime_hostname` in Route 53.

## Alarms and costs

`platform` creates the alarms topic with `alarm_email` (or uses `alarm_topic_arn`) and a budget with `monthly_budget`. In staging and prod the destination is mandatory and `alarm_email` rejects example values (`REEMPLAZAR`, `example.com`).

## Commands

Requirements: Terraform from `.terraform-version` (or `>= 1.11`), AWS credentials (OIDC in CI) and one state bucket per account, `node-template-<environment>-tfstate`, created by `bootstrap-account.sh`.

```bash
ENV=dev backend/infra/scripts/deploy-aws.sh plan data               # saves the plan of a stack
ENV=dev backend/infra/scripts/deploy-aws.sh apply data              # applies that plan, without planning again
ENV=dev backend/infra/scripts/deploy-aws.sh plan service identity   # one service
ENV=dev backend/infra/scripts/deploy-aws.sh destroy                 # in reverse order
```

`plan` takes the state lock (waits up to `LOCK_TIMEOUT`, 5 minutes) and saves the plan in `backend/infra/terraform/.plans/<environment>/`; `apply` applies exactly that file, so the pipeline applies what was reviewed. If the state changed after the plan, Terraform rejects it and you have to plan again. Since a stack reads the outputs of the previous ones, with `all` it is best to plan and apply stack by stack in order.

Local environment (Docker and LocalStack):

```bash
backend/infra/scripts/local.sh up          # containers
backend/infra/scripts/local.sh tf apply    # platform and messaging against LocalStack
backend/infra/scripts/local.sh reset       # deletes containers and volumes
```

On startup, LocalStack creates on its own the topics, queues, DLQs and subscriptions from `topology.json` with the `local` prefix (`MESSAGING_NAME_PREFIX`), without Terraform. The local Terraform uses the `node-template-local` prefix to avoid clashing with them.

Validation without AWS, same as CI:

```bash
terraform -chdir=backend/infra/terraform fmt -check -recursive
node backend/infra/scripts/tf-validate.mjs
tflint --init --config "$PWD/backend/infra/terraform/.tflint.hcl"
tflint --chdir backend/infra/terraform --recursive --config "$PWD/backend/infra/terraform/.tflint.hcl"
python3 -B -I -m unittest discover -s backend/infra/terraform/modules/rds-postgres/lambda/db_bootstrap
python3 -B -I -m unittest discover -s backend/infra/terraform/modules/http-api/authorizer
python3 -B -I backend/infra/scripts/check_vendor.py backend/infra/terraform/modules/rds-postgres/lambda/db_bootstrap
```

## Deployment pipeline

The `deploy.yml`, `publish-web.yml` and `publish-mobile.yml` workflows access AWS through OIDC. There are no long-lived keys: each job assumes a role with `aws-actions/configure-aws-credentials`. The `global` stack creates the roles with `modules/oidc-github`, together with the ECR repositories and the artifacts bucket; `read-global-outputs.sh` passes the bucket and the repository prefix to the services job. `publish-service.sh` pushes to the existing repositories and never creates one.

Roles and variables of the GitHub repository. Each GitHub environment, named like the environment (`dev`, `staging`, `prod`), stores these variables:

| Variable                    | Use                                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vars.AWS_DEPLOY_ROLE_ARN`  | Role for Terraform and for reading the state, of the stacks and of each service.                                                                                                                                                                               |
| `vars.AWS_PUBLISH_ROLE_ARN` | Role that pushes images to ECR and artifacts to the artifacts bucket.                                                                                                                                                                                          |
| `vars.AWS_WEB_ROLE_ARN`     | Role that publishes the web and invalidates CloudFront.                                                                                                                                                                                                        |
| `vars.AWS_REGION`           | AWS region of the environment.                                                                                                                                                                                                                                 |
| `vars.NAME_PREFIX`          | Name prefix, for example `node-template-dev`. Used by the web.                                                                                                                                                                                                 |
| `vars.ARTIFACTS_BUCKET`     | Artifacts bucket. Read by `publish-mobile.yml`; the services pipeline takes it from `global`.                                                                                                                                                                  |
| `vars.DEPLOY_RUNNER`        | Optional. Label of a self-hosted runner inside the VPC. Without it the stacks job uses `ubuntu-latest` and the services job uses the native `ubuntu-24.04-arm`; a custom runner still builds `linux/arm64`, because the build passes `--platform linux/arm64`. |

Order per service. Services are discovered by walking `environments/<environment>/services/*`: every folder with `terraform.tfvars` and `backend.tfvars` is a service, and the workflow has no fixed list. For each one, four steps run in order: publish the artifact (an image tagged `sha-<commit>` or a Lambda package in S3), migrate the database, plan and apply the `service` stack. The artifact goes first because the `apply` needs `TF_VAR_image` or `TF_VAR_lambda_package`. Before the services, the stacks job applies `network`, `platform`, `data`, `messaging` and `edge`, in that order, planning and applying each one before the next because it reads their outputs.

Migrations. Migrations run on the job's runner and need to reach the database through RDS Proxy. That is why a runner inside the VPC (`vars.DEPLOY_RUNNER`) is preferable to a GitHub-hosted one. `migrate-service.sh` reads the service's database and credentials from the `data` stack outputs and masks them in the logs.

Artifacts. `scripts/service.Dockerfile` builds one `linux/arm64` image per service from the bundles in `backend/dist/<service>` and the production `node_modules` of `pnpm deploy --prod`, on a Node base image pinned by digest; the image runs `node main.mjs`, and a worker without `command` runs `node worker.mjs`. Its `lambda` stage is the Lambda package of the same service, which `publish-service.sh` zips. `publish-service.sh` and the smoke both pass `--platform linux/arm64`, and `deploy.yml` publishes on the native `ubuntu-24.04-arm` runner unless `DEPLOY_RUNNER` names another. The CI job `artifact-smoke` builds every image and package on an ARM runner and proves they start; to run it locally, bundle the services and run:

```bash
pnpm nx run-many -t build --projects='tag:type:app'
node backend/infra/scripts/artifact-smoke-cli.mjs --services=tasks
```

It starts its own network, PostgreSQL and Valkey (the images of `backend/docker-compose.yml`), runs `node migrate.mjs all` in each image, waits for `/health/ready` from `node main.mjs`, loads `lambda.handler` from the package, and then removes the containers, the network and the images it built. Shared settings come from `backend/infra/local/artifact-smoke.env`; secrets are generated per run.

Local smoke. The CI job `local-smoke` runs the deploy smoke tests (`backend/e2e/deploy-smoke`, ADR 0043) against the five images, with no AWS:

```bash
pnpm nx run deploy-smoke:local
```

`backend/infra/scripts/local-smoke-cli.mjs` builds the images, starts `backend/infra/local/smoke.compose.yml` (PostgreSQL, Valkey, LocalStack with the SNS and SQS topology, the API and the worker of each service with HMAC internal calls, and an nginx gateway on `127.0.0.1:18480` that routes the path prefixes of the `service` tfvars), migrates each service, and then twice runs identity's seed with the fixed account of `backend/infra/local/smoke.env` and the suite. The second round proves that the seed is idempotent and resets the account. It removes its compose project, volumes included, and the images it built. Against a deployed environment the suite runs with `SMOKE_BASE_URL` and `SMOKE_ACCOUNT` set: `pnpm nx run deploy-smoke:run`.

Mobile app. The pipeline only builds the `.aab` and uploads it to the artifacts bucket under the commit. Store upload and release signing require the account holder's credentials and are not automated.

Testing the scripts without touching AWS. With `DRY_RUN=1` each command is printed with the `+ ` prefix instead of being executed, and reads return `<dry-run>`. To test against the services fixture:

```bash
DRY_RUN=1 TF_ROOT=backend/infra/scripts/__tests__/utils/fixtures/terraform GIT_SHA=abc1234 \
  ARTIFACTS_BUCKET=fixture-artifacts ECR_PREFIX=fixture-dev AWS_REGION=us-east-1 \
  backend/infra/scripts/deploy-service.sh dev fixture-mixed
node --test backend/infra/scripts/__tests__/*.test.mjs
```

## Decisions

- Internet egress: `egress` (`none`, `single_nat` in dev, `per_az_nat` in staging and prod) adds NAT only for the private application subnets. The data subnets have no route to the Internet. See [ADR 0016](../../../docs/adr/0016-network-egress.md).
- Terraform removes the default egress rule from security groups: every egress is explicit.
- Some descriptions force a new resource in AWS when they change: `aws_security_group` (modules `alb`, `http-api`, `network`, `service-fargate`, `service-lambda`, `observability`, `rds-postgres`, `valkey`) and the parameter groups of `rds-postgres` and `valkey`. They may change freely until the first apply; after it they stay fixed, because changing one replaces the security group or parameter group.
- Trivy exceptions (`trivy:ignore`) sit next to the resource with their reason: HTTPS egress of the services through NAT, the public realtime ALB, HTTP on the internal ALB behind the VPC link and SSE-S3 encryption of the ALB access logs.
- `db_deletion_protection` is on and the final snapshot is created unless `db_skip_final_snapshot = true`. Turn them off only in disposable environments.
- KMS keys: they all come from the `kms-key` module, with the same base policy. The logs of all services (Fargate and Lambda) share one CMK per environment from the `platform` stack; the roles already limit which log group each component writes to. RDS, messaging, Valkey, files and secrets keep their own CMK.
