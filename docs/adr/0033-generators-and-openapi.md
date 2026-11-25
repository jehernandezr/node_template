# 0033. Service and module generators, and OpenAPI from the contracts

- Status: Accepted
- Date: 2026-11-24
- Related: [ADR 0015](0015-repository-structure-and-shared-code.md), [ADR 0017](0017-contract-export.md)

## Context

F11 asks to generate a service and a module with the structure of the existing ones, without `@nx/devkit`, and to publish each contract's routes in OpenAPI without `@nestjs/swagger`.

## Decision

- **`generators` project** in `backend/tools/generators`, with text templates in `templates/` (`.tpl` files, which neither the compiler nor the linter treat as code) and substitution of `__name__`, `__Name__`, `__NAME__`, `__nameCamel__` and `__name_snake__`. The generated output goes through prettier and never overwrites an existing file.
- **`nx run generators:service -- --name=<n>`** creates the app (bootstrap, configuration, `project.json`, `app.module.ts` with the move operations and an empty manifest), the contract with its move operations and the `dev` tfvars, and prints the lines for the shared files, among them the one for identity's `TenantMoveParticipants`, without which the `MoveTenant` saga would not move the new service's data.
- **`nx run generators:module -- --service=<n> --name=<m>`** creates the module's layers, its facade with its implementation and a fake, its migrations block and the lines in `app.module.ts`, `database/shard-migrations.ts` and `migration-ranges.constants.ts`, at the `// generated:modules` markers. It computes everything before writing: if a marker is missing it leaves nothing half done. Generated services come with the markers and the five existing ones have them too, so the generator works for all of them.
- **`nx run generators:verify`** generates the skeleton with the name `tasks` and compares its bootstrap and configuration files byte by byte: a template that drifts from the real service fails.
- **`nx run generators:smoke`** generates, in a temporary copy of the workspace (the root files, `backend/` without build output or reports, the front's Nx plugin and a link to `node_modules`), a `smoke-probe` service with a `probe-items` module, adds the two shared lines without which it does not compile or pass the lint (its contract's alias in `tsconfig.base.json` and its `scope` in the boundaries rule of `eslint.config.mjs`) and runs `lint`, `test`, `typecheck` and `build` for the service and its contract, without the Nx daemon or cache. The copy is deleted on every path. It takes about a minute, so CI runs it on every change, in the Nx job.
- **OpenAPI.** `contracts-export` writes `export/openapi.json` (OpenAPI 3.1) for each contract from the same source as `contract.json`, in `export` and `check` and with the `openapi` target: routes with parameters, body, success response, a `default` with Problem Details and the codes in `x-error-codes`, and permissions in `x-permissions`. `$ref`s to another contract point to its `openapi.json`.

## Consequences

### Positive

- A new service is born identical to the existing ones, and CI detects when the template and `tasks` drift apart or when the generated output stops passing its targets.
- Routes are published without new dependencies and with the same schemas the code validates.

### Costs

- The lines for the shared files (aliases, `init.sql`, `.env.example`, Nx boundaries, `contracts-export` dependencies) are added by hand. The smoke test adds only the two it needs to compile; the others do not change what the four targets run.
- The smoke test depends on the list of services in the boundaries rule still being written as `...[...].map(`: if its shape changes, it fails with a message that says so.
- The generated service does not come with a `health` module: the health endpoints are already served by the runtime.
