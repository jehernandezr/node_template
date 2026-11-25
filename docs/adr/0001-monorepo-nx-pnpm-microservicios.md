# 0001. Nx monorepo with pnpm and one microservice per app

- Status: Accepted
- Date: 2026-11-11

## Context

`node_template` is a 2022 Express project with a single application. The new platform needs several microservices that share platform libraries and contracts, but do not share business code or databases.

## Decision

The repository is an Nx workspace with pnpm. Each microservice is an app in `apps/` with its own domain, database, migrations and deployment. The only things the services share are the libraries in `libs/platform` and the contracts in `libs/contracts`.

Three rules are checked in CI:

- An app depends only on `scope:shared` libraries (`@nx/enforce-module-boundaries`).
- Inside a module, `domain` depends only on `kernel` and the outer layers depend inward (`dependency-cruiser`).
- CI runs `nx affected`: it tests, builds and deploys only what changed.

## Consequences

Positive:

- A new service comes out of a generator and inherits the dependency rules.
- A contract change is reviewed in the same PR that uses it.
- The pipeline does not rebuild or redeploy services that did not change.

Costs:

- Each service has its own database, migrations and deployment to maintain.
- The boundary rules must stay active in CI. If they are relaxed, code from one service can end up importing another.

## Alternatives considered

The architecture document does not record alternatives evaluated for this decision.
