---
name: backend-estructura
description: 'Backend folders, layers, Nx projects, aliases and test placement. Use it when creating or moving libraries, apps, modules, folders or tests.'
paths:
  - 'backend/**/project.json'
  - 'backend/**/tsconfig*.json'
  - 'backend/**/jest.config.cjs'
  - 'backend/**/src/index.ts'
  - 'backend/eslint.config.mjs'
  - 'backend/package.json'
---

# Backend structure

## Root

- The root only has `backend/`, `front/`, Nx as orchestrator and repository tooling (CI/CD, hooks, docs).
- The backend owns its libraries in `backend/libs`. The front has its own skill, `front-estructura`.

## Dependencies: a single `node_modules`

- One pnpm workspace with a single `node_modules` at the root. External dependencies are declared in a single backend `package.json` (or the root one for tooling), with exact versions.
- Backend libraries are not packages: they have no `package.json` or `node_modules` of their own. They are Nx projects (`project.json` with their tags) imported through TypeScript aliases (`@platform/kernel`, `@contracts/identity`) declared in `tsconfig.base.json`.
- Boundaries are enforced by `@nx/enforce-module-boundaries` with tags. An import that crosses a forbidden boundary breaks the lint; it is not fixed with a new alias.
- Import through the project's public alias (`@platform/kernel`), never through a deep path into another project (`@platform/kernel/src/errors/...`).
- New dependency: before adding it, check whether reimplementing it is reasonable. It is accepted only if doing it in-house is unwise (cryptography, protocols) or expensive. It is isolated behind a port.
- No circular dependencies between projects or between folders of a service.

## Layers inside a service

Example in `references/ejemplos.md`, section "Layers inside a service".

- Group by business module, not by technical type. Inside the module, by layer.
- A module exposes to the rest only what its `index.ts` exports. Everything else is private.
- Dependency direction: `presentation` and `infrastructure` toward `application`, `application` toward `domain`, `domain` toward `@platform/kernel`. An architecture test (a lint rule or `dependency-cruiser`) checks it in CI.

## Code folders

- Code goes directly in `src/`. There is no `src/lib/`.
- What is shared inside a service lives in `shared/{enums,constants,types,utils}`.

Example in `references/ejemplos.md`, section "Code folders".

## NestJS only in `src/nest/`

- The core of a library in `libs/platform`, `libs/contracts` and `libs/shared` does not import `@nestjs/*` or another library's sub-entry (`@platform/<lib>/nest`). The wiring lives in `src/nest/`, which exposes the `@platform/<lib>/nest` alias.
- The ESLint rule `layout/no-nest-outside-nest-folder` and `check-structure.mjs` check it. Apps and service modules (`presentation/`) use NestJS freely.

## Exported functions

- Behavior goes in classes. `check-structure.mjs` only allows exported functions in `utils/`, in migrations, in `index.ts`, in configuration files and in its declared exception list (`FUNCTION_EXCEPTIONS`): the `define*` factories of `contracts/*/src/kit`, the `env.ts` schemas and `secret()` of config, and the tools' `main()`.
- A new exception is added to that list with its reason and a test in `check-structure.test.mjs`.

## Tests

- Each code folder has its own `__tests__/` folder with that folder's tests. Example: `users/src/modules/sign-in/application/__tests__/`.
- Never a `.spec.ts` next to the source file, nor a single test folder at the module root. This replaces the NestJS default convention.
- What tests share (fakes, builders, containers, reusable contracts) goes inside the test structure, never in a separate `testing/` folder:
  - `__tests__/utils/` of a folder, if only that folder's tests use it;
  - the project's `src/__tests__/utils/`, if several folders use it. If another library needs it, it is exposed through the `@platform/<lib>/test-utils` alias.
- Tests of a utility go in the `__tests__/` that contains it (for example `src/__tests__/fake-rate-limiter.spec.ts`), not in a nested `__tests__` inside `utils/`.
- Integration tests end in `.int-spec.ts`. `check-structure.mjs` rejects `*.integration.spec.ts`, which would run as a unit test.
- Production code never imports anything from `__tests__/`.
- An app's end-to-end tests live in `backend/apps/<app>/e2e/`.
- The end-to-end flow across services lives in `backend/e2e/platform-flow` (tags `type:e2e` and `scope:e2e`), with its `platform-flow:e2e` target. It is the only project that imports apps, and only through `@apps/<service>/test-utils` (`allowAppImports` in `backend/eslint.config.mjs`).
- Details in `backend-pruebas`.

## Build

- Libraries are not built separately: their target is `typecheck`.
- Each app is bundled with esbuild into `backend/dist/<app>/`. There is no `dist/` inside libraries or apps.
- `backend/dist/` is in `.gitignore`.
- Migrators (`migrate`) are bundled as a binary of the same app. TypeORM migrations are compiled with the app, because the `run` and `revert` CLI only loads JavaScript.

## File names

- kebab-case with a role suffix: `sign-in.use-case.ts`, `user.repository.ts`, `typeorm-user.repository.ts`, `user.entity.ts`, `users.module.ts`, `users.facade.ts`.
- One file, one public class. Full role table in `backend-codigo-enterprise/references/nombres.md`.
- No generic `utils.ts` or `helpers.ts` files. If there is logic, it has a business name and is a class.
- `index.ts` files only re-export the public API. No logic and no internal barrels that mix layers.

## How to create a new library

```
- [ ] project.json with type and scope tags
- [ ] Alias in tsconfig.base.json
- [ ] tsconfig.json and jest.config.cjs
- [ ] src/index.ts with the public API
- [ ] typecheck and test targets
- [ ] pnpm nx lint <project> passes without breaking boundaries
```

## With pstack

Method in `pstack-en-node-template`. From pstack, these apply here: `how`, `why`, `principle-encode-lessons-in-structure`, `correct`, `principle-migrate-callers-then-delete-legacy-apis`, `principle-subtract-before-you-add`.
