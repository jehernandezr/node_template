# How to contribute

This document describes how to propose changes to the repository. The full architecture rules are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), the plan in [docs/plan/README.md](docs/plan/README.md) and the environment setup in [docs/local-development.md](docs/local-development.md).

## Branches

Each change starts from `main` on a branch with a prefix for its type:

| Prefix   | Use                                      | Example               |
| -------- | ---------------------------------------- | --------------------- |
| `feat/`  | New functionality                        | `feat/tasks-crud`     |
| `fix/`   | Bug fix                                  | `fix/mfa-code-expiry` |
| `chore/` | Maintenance, dependencies, configuration | `chore/husky-setup`   |

Use lowercase names and separate words with hyphens.

## Commits

Messages follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), in English with a lowercase subject:

```text
<type>(<optional scope>): <description in the imperative, in lowercase>
```

Examples:

```text
feat(contracts): catalog the new internal-api and saga codes
fix(primitives): classify aws sdk throttling as a transient failure
chore: wire the new modules into the terraform root
```

Valid types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci` and `revert`. The scope is usually the project or folder that changes (`saga`, `contracts`, `front`, `infra`).

Messages do not include AI attribution lines or `Co-Authored-By` lines.

### Hooks

`pnpm install` installs the Husky hooks:

- `commit-msg` validates the message with commitlint (`@commitlint/config-conventional`) and rejects messages that do not comply.
- `pre-commit` runs lint-staged on the staged files: Prettier for JS, TS, JSON, Markdown and YAML; ESLint with `--fix` for the TypeScript in `backend/` (it rejects a test outside `__tests__/` and any file in `src/lib/`); `dart format` for the Dart in `front/`.

The hooks use `pnpm exec`, so they need `pnpm` on the `PATH` of the terminal or editor that makes the commit.

### AI agents

The code rules live as skills in `.claude/skills` (`backend-*` and `front-*`) and load automatically based on the folder being changed. The hooks in `.claude/hooks` reject forbidden paths before writing, format each written file and, before an agent finishes, run the structure scripts. The same scripts can be run by hand on the changed files:

```bash
node .claude/skills/backend-structure/scripts/check-structure.mjs
node .claude/skills/front-structure/scripts/check-structure.mjs
```

For a large piece of work, the `backend-lead` and `front-lead` agents split it into packages with disjoint files, and `backend-implementer` and `front-implementer` write each package. How they are organized into troops and waves is in the [plan](docs/plan/README.md#how-a-wave-ran).

## Before opening a PR

From the root, with `pnpm install` done and `flutter pub get` run in `front/`:

```bash
pnpm nx affected -t lint test test-int typecheck build analyze format-check
pnpm nx format:check
```

If you changed a contract, also:

```bash
pnpm nx run contracts-export:export
(cd front && dart run contracts_gen)
pnpm nx run contracts-export:check
(cd front && dart run contracts_gen --check)
```

Review checklist:

- [ ] The branch has a `feat/`, `fix/` or `chore/` prefix.
- [ ] The commands above pass without errors.
- [ ] The changes respect the hexagonal layers: the domain does not import frameworks.
- [ ] In the backend, tests are in the `__tests__/` folder of the folder they test, their utilities in `__tests__/utils/`, code is directly in `src/` and no `package.json` or `node_modules` appeared outside the root.
- [ ] In the front, tests are in the package `test/` with the folders of `lib/src`, what a package shares in its `test/utils/` and what packages share in `front/packages/test_utils`.
- [ ] A new table has its entity and its migration generated with the TypeORM CLI, with `synchronize` off.
- [ ] A new external backend dependency is only in `backend/package.json`, with an exact version.
- [ ] Event, error, permission, queue and job identifiers use enums, not string literals.
- [ ] New error codes use the `SERVICE.SUBMODULE.ERROR` format and have their catalog entry.
- [ ] New identifiers are UUIDv7.
- [ ] Each internal operation that modifies data declares its compensation.
- [ ] If a contract in `backend/libs/contracts` changed, `export/contract.json` and the Dart in `front/packages/contracts` are regenerated in the same PR.
- [ ] A new architecture decision has its ADR in `docs/adr/`.
- [ ] There are no `.env` files or secrets in the diff.

## Architecture rules

**Minimal root.** The root only has `backend/`, `front/`, Nx and the repository tooling. Shared backend code lives in `backend/libs`, shared front code in `front/packages`, and code shared within a service or microfrontend in its `shared/{enums,constants,types,utils}` folder. See [ADR 0015](docs/adr/0015-repository-structure-and-shared-code.md).

**Persistence with TypeORM.** Entities, mappers and repositories live in each module's `infrastructure/persistence`, and migrations are generated and applied with the TypeORM CLI. The shard key is declared in `PersistenceModule.forFeature`. The `@platform/persistence` layer on TypeORM follows the [design](docs/design/typeorm-persistence-and-sagas.md) and [ADR 0024](docs/adr/0024-typeorm-persistence-sharding-persistent-sagas.md), and its construction is in the [plan](docs/plan/README.md).

**A single `node_modules`.** External backend dependencies are declared only in `backend/package.json`, with exact versions, and the Nx and hook dependencies in the root `package.json`. Backend libraries, apps and tools have no `package.json`: they are Nx projects (`project.json`) and are imported through the aliases in `backend/tsconfig.base.json`. A new library follows the `backend-structure` skill: code directly in `src/`, tests in the `__tests__/` of each folder and shared test utilities in `__tests__/utils/`. Libraries are not compiled; only apps are bundled with esbuild into `backend/dist/<app>/`.

**Hexagonal layers.** Inside each module, `domain` depends only on `kernel`. The domain does not import NestJS, TypeORM, AWS or any infrastructure library. Use cases depend on the domain, and `infrastructure` and `presentation` depend on both.

**Project boundaries.** The `@nx/enforce-module-boundaries` rule in `backend/eslint.config.mjs` limits dependencies by tags (`type:contracts`, `type:util`, `type:platform`, `type:tool`, `type:app`). The `lint` target checks it.

**Enums instead of literals.** Event, error, permission, queue and job names are declared as enums. A rename must be caught by the compiler, not by a text search.

**UUIDv7 identifiers.** Every entity gets its ID when created, generated by the application with the `IdGenerator` port. In TypeORM, use `@PrimaryColumn('uuid')`.

**Declared compensation.** Each internal operation that modifies data declares how it is reverted with `compensatedBy`, or `Compensation.None` with a reason. Sagas use that declaration to undo completed steps.

**Regenerated contracts.** Contracts are written in TypeScript with zod in `backend/libs/contracts/<service>`. A change there requires exporting the JSON and regenerating the Dart in the same PR. The CI `contracts` job fails if the generated output is out of date. See [ADR 0017](docs/adr/0017-contract-export.md).

**Validate before calling.** Every client, backend or front, validates the request against the contract before calling.

**External dependencies.** Before adding a library, check whether `node:crypto` or the standard library covers it with little code of our own. A dependency comes in when reimplementing it is unwise or costly, and it is declared with an exact version (F4 design, section 9).

**Decisions in ADRs.** A new architecture, dependency or convention decision is recorded as an ADR in `docs/adr/`, with the context, the decision and its consequences. An accepted ADR is not rewritten: it gets a revision line or is marked as superseded by another one. See [how to add an ADR](docs/adr/README.md).

## CI

Every PR runs `ci.yml` and `security.yml`. The only required check for `main` is `ci-ok`, which aggregates the result of the `ci.yml` jobs; the repository owner configures the protection of `main`. The `nx` job enforces minimum coverage in the backend and `typecheck` also checks the tests. The `terraform` job validates each stack with `terraform test`, the Python tests, shellcheck and tflint. The details are in [ADR 0019](docs/adr/0019-ci-and-toolchain.md) and [ADR 0020](docs/adr/0020-terraform-stacks-and-runtime-per-service.md).

## Review

- A small PR focused on a single change is reviewed faster.
- The description follows the repository template: what changes, why and how it was tested.
- Contract, migration or permission changes require an additional review.
