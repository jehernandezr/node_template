# 0015. Repository structure and shared code per application

- Status: Accepted
- Date: 2026-11-12
- Revised: 2026-11-13 (a single `node_modules`, libraries by alias, tests in `__tests__/` and only the apps are compiled)
- Revised: 2026-11-14 (backend test utilities go in `__tests__/utils/`, and the `src/ids/` example corresponds today to `src/id-generator.ts` with its test in `src/__tests__/id-generator.spec.ts`; the test doubles shared by several front packages live in `front/packages/test_utils`, only in `dev_dependencies`, and those of a single package in its `test/utils/`; the root includes `.claude/` with skills, hooks and agents)

## Context

The repository mixed the Node workspace (Nx, pnpm, libraries, Terraform) with the Flutter front at the root. In addition, the enums, constants and types shared by the services and the microfrontends were scattered, and the contracts existed only in Dart or only in TypeScript.

## Decision

### Repository root

The root contains only:

- `backend/`: the backend's apps, libraries, tools and infrastructure. `backend/package.json` is the only `package.json` of the backend: it declares all its external dependencies, with exact versions. `backend/tsconfig.base.json` declares the library aliases.
- `front/`: Flutter pub workspace (shells, microfrontends, packages, tools).
- Nx as the orchestrator: `nx.json`, `package.json` (Nx, its plugins and the git tooling), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.nvmrc` and a `tsconfig.json` that only extends `backend/tsconfig.base.json`, because Nx looks for the aliases at the root.
- What belongs to the repository itself: `.github/` (CI/CD), `.husky/`, `commitlint.config.mjs`, `lint-staged.config.mjs`, Prettier, `docs/`, `README.md`, `CLAUDE.md` and `renovate.json`.

Each application owns its libraries and utilities. Nothing shared between backend and front lives at the root: the front receives the contracts generated from the backend.

### Orchestration with Nx

A single Nx graph covers backend and front:

- Each TypeScript project is a `project.json` with its name and its tags. The `@nx/jest` and `@nx/eslint` plugins, limited to `backend/**`, add `test` and `lint`; `typecheck` and `build` come from `targetDefaults`.
- `front/tools/nx-plugin` registers each member of the pub workspace as a `front-<name>` project with the `analyze`, `format-check` and `test` tasks (cached). The dependencies between Dart packages come from their `pubspec.yaml`.
- `front-contracts` depends on the `backend/libs/contracts` packages, so a contract change marks as affected the front packages and microfrontends that use it.
- `pnpm nx affected -t lint test typecheck build analyze format-check` is the CI command and the everyday one.

### Backend

```
backend/
  apps/<service>/src/
    modules/<module>/{domain,application,infrastructure,presentation}/
    shared/{enums,constants,types,utils}/   # shared between the modules of that service
  libs/
    contracts/
      platform/        # @contracts/platform: contract kit and cross-cutting pieces
      <service>/      # @contracts/<service>: what the service exposes to others
        src/
          enums/       # enums only
          constants/   # constant values and `as const` objects
          types/       # types and interfaces (includes `z.infer` of the schemas)
          schemas/     # zod schemas for inputs, outputs and payloads
          http/        # public routes consumed by the front
          internal/    # internal operations between services
          events/      # published events
        export/contract.json   # generated, committed to git
    shared/
      utils/           # @shared/utils: pure functions that use the contracts types
    platform/          # runtime: kernel, primitives, config, observability, saga...
  tools/               # Nx generators, contracts-export and app-bundler
  infra/               # Terraform and local environment
  dist/<app>/          # bundle of each app (esbuild), outside git
```

### Backend dependencies, aliases and compilation

- A pnpm workspace with two importers, the root and `backend/`, and `nodeLinker: hoisted`: there is a single `node_modules`, at the root. Exact versions avoid nested copies inside `backend/`, and CI fails if a `node_modules` appears outside the root.
- The backend's libraries, apps and tools are not packages: they have no `package.json`. They are Nx projects (`project.json` with tags) and are imported through the aliases in `backend/tsconfig.base.json` (`@platform/kernel`, `@platform/kernel/test-utils`, `@contracts/identity`). Jest resolves them with the Nx resolver, the tools with `tsx` and the apps with esbuild.
- Libraries are not compiled separately: their target is `typecheck` (`tsc` without emitting on `tsconfig.lib.json` and `tsconfig.spec.json`). There is no `dist/` inside libraries or apps.
- Each app is bundled with esbuild into `backend/dist/<app>/` with the `build` target from `nx.json` (`backend/tools/app-bundler`). The libraries go into the bundle; the dependencies from `node_modules` stay external. Since esbuild does not emit the decorator metadata that NestJS needs, our own TypeScript first goes through SWC with the same configuration as the tests.
- The tools in `backend/tools` run with `tsx` and the aliases, without their own compilation.

### Backend code and test folders

- Code goes directly in `src/`, without `src/lib/`.
- The tests of each folder go in its `__tests__/` folder: unit tests in `*.spec.ts` and integration tests in `*.int-spec.ts`. For example, `src/ids/uuid-v7-id-generator.ts` is tested in `src/ids/__tests__/uuid-v7-id-generator.spec.ts`.
- The test doubles and the support shared by the tests go in `__tests__/utils/` (of the folder or, if several use them, of `src/__tests__/utils/`). If another library uses them, they are exported with the `@platform/<lib>/test-utils` alias.
- The Jest preset (`backend/jest.preset.js`) only looks for tests in `src/**/__tests__/`, and an ESLint rule in `backend/eslint.config.mjs` rejects a test outside those folders and any file in `src/lib/`.
- The `backend-estructura` skill details the convention.

### Front

```
front/
  apps/{web,mobile}/
  microfrontends/<mf>/lib/src/
    screens/  data/  l10n/
    shared/{enums,constants,types,utils}/   # shared between the screens of the microfrontend
  packages/
    contracts/         # lib/src/core (by hand) and lib/src/<service>/{enums,constants,types,schemas,http} (generated)
    utils/             # pure functions that use the contracts types
    api/               # ApiClient: validates the request against the contract before calling over HTTP
    shell_core/ shell_host/ test_utils/ ui/ tokens/ i18n/ auth/
  tools/contracts_gen/ # generates Dart from backend/libs/contracts/*/export/contract.json
```

### Dependency rules

Inside each contracts package and each `shared/` folder:

| Folder                       | Can import                                                |
| ---------------------------- | --------------------------------------------------------- |
| `enums`                      | nothing                                                   |
| `constants`                  | `enums`                                                   |
| `types`                      | `enums`, `constants`                                      |
| `schemas`                    | `enums`, `constants`, `types`                             |
| `http`, `internal`, `events` | everything above                                          |
| `utils`                      | `enums`, `constants`, `types` (and `schemas` to validate) |

Between backend projects (Nx tags, `@nx/enforce-module-boundaries` rule):

- `type:contracts` depends only on `type:contracts` and on zod.
- `type:util` depends on `type:contracts`.
- `type:platform` depends on `type:platform`, `type:util` and `type:contracts`.
- `type:app` depends on all of the above, but from another service it only imports its `@contracts/<service>` package, never its internal code.

### Validate before calling

Every inter-process call validates against the contract before going out over the network:

- Backend: `InternalClient.call(operation, input)` validates the input with the operation's schema. If it is invalid, it returns the contract error without making the HTTP call. The response is also validated when it arrives.
- Front: `ApiClient` validates the request with the generated validator and throws `ContractViolationException` with the same `FieldError` as the server, without calling over HTTP. The response is decoded with the generated type.
- The server always validates again; validating on the client saves the call and gives the error sooner, but the server is the authority.

### A single source of truth

The contracts are written in TypeScript with zod in `backend/libs/contracts`. `contracts-export` writes `export/contract.json` (JSON Schema 2020-12 plus metadata for routes, operations, events, enums and constants). `front/tools/contracts_gen` generates the Dart. CI fails if the JSON or the generated Dart differ from what is committed.

## Consequences

- `pnpm install` at the root installs Nx and the backend into a single `node_modules`; `flutter pub get` in `front/` prepares the front. After that, everything runs with Nx from the root.
- A new external dependency of the backend is added only in `backend/package.json`, with an exact version. A new library is a `project.json`, its alias in `backend/tsconfig.base.json` and its `tsconfig` and `jest.config.cjs` files.
- No library is published as an npm package; if that were ever needed, it would have to get a `package.json` and its own compilation back.
- The access enums (roles, permissions, plans, flags) move from hand-written Dart to TypeScript, and the front receives them generated.
- A change in a backend contract requires regenerating the Dart in the same change.
