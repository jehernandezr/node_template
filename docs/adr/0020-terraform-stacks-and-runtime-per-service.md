# 0020. Terraform by stacks and API runtime chosen per service

- Status: Accepted, amended by [ADR 0039](0039-runtime-matrix-per-service.md) (runtime matrix, always-on worker, computed priorities), [ADR 0040](0040-internal-routing-and-authentication.md) (internal routing through Lattice), [ADR 0041](0041-secrets-and-database-credentials.md) (secrets and IAM database auth), [ADR 0042](0042-region-and-catalog-model.md) (one catalog per service, `global` stack), [ADR 0043](0043-deploy-migrations-and-rollback.md) (pipeline and the `service-base` stack) and [ADR 0045](0045-edge-domains-and-real-time.md) (real time behind CloudFront)
- Date: 2026-11-13

## Context

The plan asks for a `platform` root and one root per service with its own state, an HTTP API Gateway behind CloudFront with WAF and one database per service inside the shared RDS instance. The first version had a single root with the services in a map, the APIs on Fargate behind a public ALB, one schema per service in a `platform` database and reads through an RDS Proxy that does not support replicas outside Aurora. Deploying one service planned the whole platform and AWS diverged from the local environment.

## Decision

- Structure (the same as the Solventa project): `modules/`, `stacks/<layer>` and `environments/<environment>/<stack>/{backend.tfvars,terraform.tfvars}`. Each stack has `config.tf` with an empty S3 backend, `remote_state.tf` and a `variables_common.tf` identical in all of them. Stacks: `network`, `platform`, `data`, `messaging`, `edge` and `service`, which is instantiated once per service with its state in `<region>/services/<service>/terraform.tfstate`.
- Environments `local` (LocalStack: `platform` without compute and `messaging`), `dev`, `staging` and `prod`. Scripts in `backend/infra/scripts`: `deploy-aws.sh`, `local.sh` and `tf-validate.mjs`.
- Runtime per service: `api.runtime = "lambda"` (HTTP API Gateway) or `"fargate"` (internal ALB through a VPC link). All APIs come in through the same HTTP API behind CloudFront and WAF; an authorizer requires `X-Origin-Verify`, whose value lives in Secrets Manager. Real time always runs on Fargate behind a public ALB. Fargate workers scale by queue from zero and consumers can be Lambda.
- Data: one database per shard of each service (`<service>_shard_<n>`) and one `<service>_catalog` per service ([ADR 0042](0042-region-and-catalog-model.md)). The bootstrap creates the `<service>_owner`, `<service>_app` and `<service>_reader` roles and the databases with their owner and `vector`, and never deletes ([ADR 0041](0041-secrets-and-database-credentials.md)). Each service receives the `DB_*` keys of `databaseConfigSchema` from `service-base`, with `DB_AUTH=iam`, `DB_INSTANCES` and `DB_CATALOG_NAME`. Reads go directly to the replicas listed in `DB_INSTANCES`, as the reader role; RDS Proxy is kept for writes.
- Least privilege: IAM is per component. Messaging comes from `producers` and `consumer` in `topology.json`: each worker and each consumer consumes only its queue, and the API and real time do not consume. `files_access` and `ses_send` are requested per component. Valkey limits each user to `~<service>:*` with IAM authentication; services only go out over HTTPS and a client security group opens RDS Proxy, replicas, Valkey and OpenObserve.
- Keys: every CMK comes from the `kms-key` module, with the same base policy. Compute logs share one CMK per environment from the `platform` stack.
- Deployment: `deploy-aws.sh plan` takes the state lock and saves the plan; `apply` applies only that saved plan.
- The Terraform `local` environment applies `platform` and `messaging` against LocalStack.
- CI: `ci-ok` still aggregates only the jobs in `ci.yml`. The `main` protection (require `ci-ok` and whichever `security.yml` checks are decided) is configured by the repository owner on GitHub; it is not managed from code. Backend tests require 80 % of lines, statements and functions and 75 % of branches per project.

## Consequences

### Positive

- Deploying a service only plans its stack. Changing the runtime of its API is one field and one artifact.
- AWS and local use the same databases, queue names and filters.
- `terraform test` with mocked providers tests the stacks' logic without AWS.

### Costs

- Six stacks and one state per service: the deployment order and listener priorities unique across services have to be respected.
- An internal ALB and a VPC link if any API runs on Fargate. Replica reads have no RDS Proxy pooling.
- Rotating the origin secret requires applying `platform` and then `edge`. Null outputs are not kept in the state, which is why the stacks fill in with `null` what they read from `platform`.
- `dependency-cruiser` is pending until the first service in `backend/apps`: today there are no layers to verify and the boundaries between projects are already covered by Nx tags.

## Alternatives considered

- Services as a map in a single root: one apply per service touched the whole platform.
- One schema per service in a shared database: it breaks the logical shard of ADR 0010 and diverges from the local environment.
- A read proxy per replica: RDS Proxy does not support it outside Aurora. Aurora remains an option if read pooling is needed.
- CloudFront with one origin per service (ALB or API Gateway): it forces repeating the routes in `edge`.
