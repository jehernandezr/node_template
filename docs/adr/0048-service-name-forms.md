# 0048. Service name forms

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0033](0033-generators-and-openapi.md), [ADR 0043](0043-deploy-migrations-and-rollback.md)

## Context

The generator took a kebab-case service name and wrote it unchanged as `service_name` in the `dev` tfvars of both service stacks, while both stacks accept only snake_case there and look up `listener-priorities.json` by it. A generated service with two words failed its plan. The pipeline catalog required `service_name` to equal the folder, `migrate-service.sh` read the data stack outputs by the folder name, and `EnvironmentMocks` converted underscores to hyphens on its own. Each tool guessed the mapping, and none agreed on it.

## Decision

A service has two name forms:

| Form       | Example         | Used for                                                                                                                                                                                         |
| ---------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| kebab-case | `order-history` | Its folder under `backend/apps` and `environments/<environment>/services`, its Nx project, its contract, its routes, its ECR repository and the names of its AWS resources                       |
| snake_case | `order_history` | `service_name` in both service stacks, its state keys, its keys in `db_services`, `valkey_services` and `listener-priorities.json`, its databases, its database and Valkey roles, `SERVICE_NAME` |

- The kebab-case form is the source; the snake_case form replaces each hyphen with an underscore.
- `ServiceName` in `backend/infra/scripts/service-name.mjs` is the only translation. The service generator renders `__service_name__` with it and lists the shared lines with it, `ServiceCatalog` rejects a `service_name` that is not the snake_case form of its folder and gives both forms in each entry, and `EnvironmentMocks` and `migrate-service.sh` take the snake_case form from it.
- The stacks derive the names of their AWS resources from `service_name` by replacing each underscore with a hyphen, which gives back the kebab-case form.
- `tf-validate.mjs` plans both service stacks of `order-history` as the generator renders it, and the generator tests keep those values equal to the templates.

## Consequences

### Positive

- A generated service with two words plans in both service stacks.
- A wrong `service_name` fails in the catalog before any plan.

### Costs

- The generator imports a pipeline script module, so its Jest configuration transforms `.mjs` files.
- The stacks keep their own hyphen replacement in HCL, which `ServiceName` cannot share.

## Alternatives considered

- snake_case everywhere: folders, Nx projects and routes would break the kebab-case convention of the rest of the repository.
- kebab-case everywhere: PostgreSQL database and role names would need quoting, and the data stack keys would change for every service.
