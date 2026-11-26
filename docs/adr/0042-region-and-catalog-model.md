# 0042. Region and catalog model for F12

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0010](0010-logical-sharding-region-residency.md), [ADR 0023](0023-identity-data-routing.md), [ADR 0032](0032-tenant-moves-and-regions.md)

## Context

The docs describe the catalog three ways: a global database in the main region with replicas, a directory per service, and one `catalog` database per regional instance with `owner` and `read` services. The code follows the second: `shard_directory` is keyed by `tenant_id` alone, so each service needs its own catalog, and the tests already create one per service. Terraform and `init.sql` create a single shared `catalog`. `REGIONS`, `SERVICE_REGION` and `TENANT_MOVE_TARGETS` have no producer, and state keys are `<region>/<stack>` with no place for account-global resources.

## Decision

- **F12 deploys one region per environment.** Every stack stays parameterised by `region`; nothing assumes there is only one.
- **One catalog per service.** Each service has `<service>_catalog` on the regional instance, owned by `<service>_owner`. It holds that service's shard directory, shard map, catalog idempotency keys and its own catalog tables. Identity's catalog also holds the global indexes (`identity_lookup`, slugs, passkeys, API key prefixes), `saga_directory` and `tenant_moves`. No service reads another service's catalog; what it needs goes through an internal operation. `catalog = "owner" | "read"` and the `catalog_owner` and `catalog_reader` roles are removed. `init.sql` and the `data` stack follow the same layout.
- **Shards.** The `data` stack `db_services` is the only declaration of shards. The `service` stack builds `DB_DATABASES` and `DB_CATALOG_NAME` from the `data` outputs, with the variable names of the code's schema.
- **Region variables.** `environments/<env>/common.tfvars` holds `name_prefix`, `domain`, `main_region` and `regions` (code to AWS region, `apiBaseUrl` and `issuer`). `deploy-aws.sh` passes it before each stack's tfvars. The `service` stack sets `REGIONS` (JSON of that map), `SERVICE_REGION` (the code of the stack's region), `IDENTITY_REGION` (identity only) and leaves `TENANT_MOVE_TARGETS` unset, so the group convention of ADR 0032 applies.
- **Defaults.** Region code `us`, AWS region `us-east-1`. The user can change both before the first apply.
- **Wrong region.** A tenant of another region answers 421 `PLATFORM.SHARDING.WRONG_REGION` with `details.apiBaseUrl` and `details.region`, and the client repeats once there ([ADR 0034](0034-live-front-repositories-sse-region.md)). There is no redirect.
- **Global resources.** A new `global` stack with state key `global/<stack>/terraform.tfstate` holds what is unique per account: the GitHub OIDC provider and roles, the public Route 53 zone records shared by regions and the CloudFront certificate in `us-east-1`. It is applied first.
- **Deferred to the second region:** global identity indexes replicated across regions, the write path from a non-main region, cross-region propagation of `auth:*` revocation and of the bus, cross-region internal calls and cross-region `MoveTenant` connectivity. The decision that adds a region resolves them.

## Consequences

### Positive

- Terraform, `init.sql`, tests and code agree on one catalog layout.
- A region is one more set of states; the variables that a second region needs already exist.

### Costs

- One more database per service on the instance.
- Identity's catalog is a single point for sign-in and routing in its region; Multi-AZ covers instance failure ([ADR 0043](0043-deploy-migrations-and-rollback.md)).

## Alternatives considered

- A shared `catalog` database with a `service` column in every platform table: changes the platform tables and their migrations for no gain in one region.
- A global catalog in the main region with replicas: needs the cross-region write path, which F12 does not build.
