# Guide for AI agents

Rules for working in this repository. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before touching the architecture.

## Language

- Everything developer-facing is written in English only: docs, ADRs, the plan, skills, agents, JSDoc and `///`, commits and PRs. One text, one language: no mixing.
- User-facing product text keeps its locale (ARB files and their translations).
- Text still in Spanish is translated whole when a change touches it.

## Way of working: pstack

- All code work uses the pstack plugin: the method comes from pstack and the rules from `.claude/skills`. When they disagree, the repository wins.
- Before starting, read the `pstack-en-node-template` skill. It explains how to load pstack skills in Claude Code: with `Read` on their `SKILL.md`, because the `Skill` tool rejects them.
- The order is the `poteto-mode` playbook, `architect`, units with `tdd` and their own commit, verification with `principle-prove-it-works`, review with `interrogate`, `no-comments` and `blast-radius`, and `unslop` on docs, commits and PRs.
- Use `swarm` for parallel work and `arena` to compare approaches. On the Raspberry Pi, run only one heavy command at a time.

## Structure

- The root only holds `backend/`, `front/` (Flutter pub workspace), Nx as orchestrator and repository tooling (CI/CD, hooks, docs). See [ADR 0015](docs/adr/0015-estructura-backend-front-y-codigo-compartido.md).
- Each application owns its libraries: shared backend code lives in `backend/libs`, shared front code in `front/packages`, and code shared inside a service or microfrontend in its `shared/{enums,constants,types,utils}` folder.

## Commands

- Nx runs from the root and covers backend and front. Set up with `pnpm install` at the root and `flutter pub get` in `front/`. Examples: `pnpm nx affected -t lint test typecheck build analyze format-check`, `pnpm nx test platform-saga`, `pnpm nx test front-shell_core`.
- A new service comes from `pnpm nx run generators:service -- --name=<n>` and a module from `pnpm nx run generators:module -- --service=<n> --name=<m>` ([ADR 0033](docs/adr/0033-generadores-y-openapi.md)); a microfrontend from `front/tools/new_microfrontend.dart` (skill `front-nuevo-microfrontend`). Backend libraries follow the `backend-estructura` skill (an Nx project without `package.json`).
- Jest configs are `jest.config.cjs`.

## Code

- Code explains itself: no inline comments. Every public method has a complete, concise JSDoc (`///` in Dart). See `backend-codigo-enterprise` and `front-analisis`.
- Before writing, reviewing or merging code, load the skills in `.claude/skills`. They load by the folder you touch (`paths`); the entry point is `backend-codigo-enterprise` for the backend and `front-codigo` for the front, and each links to the rest.
- Classes, composition and constructor dependency injection. The only exported functions are stateless pure utilities and those listed in `check-structure.mjs` (contract `define*` factories, `env.ts` schemas and `secret()`, tool `main()`). No script-style modules of loose functions.
- Persistence with TypeORM ([ADR 0024](docs/adr/0024-persistencia-typeorm-sharding-y-sagas-persistentes.md)): entities and migrations generated and applied with its CLI. `synchronize` is always off.
- Backend: tests live in a `__tests__/` folder inside the folder of the code they test, never as a `.spec.ts` next to the source file. Integration tests end in `.int-spec.ts`; what another library needs from them is exported through `@platform/<lib>/test-utils`. Front: in each package's `test/`, mirroring the `lib/src` folders.
- Backend: code goes directly in `src/`, without `src/lib/`. A single `node_modules`: libraries are imported through TypeScript aliases and have no `package.json`.
- Relative imports in libraries end in `.js`, because the project uses ESM with `nodenext`.
- Every port is an abstract class without decorators and is its own injection token. A library's NestJS wiring lives in `src/nest/` and is exported through `@platform/<lib>/nest`; outside that folder nothing imports `@nestjs/*` ([ADR 0025](docs/adr/0025-capa-nestjs-por-sub-entrada-y-puertos-abstractos.md)).
- Periodic tasks are classes that extend `ScheduledJob`, run by `@platform/scheduling` ([ADR 0026](docs/adr/0026-jobs-programados-scheduledjob-y-joblock.md)). No hand-rolled `setInterval` in a library.
- The domain (`domain/`) does not import NestJS, TypeORM, AWS or other infrastructure libraries. It only depends on `kernel`.
- `application/` depends on `domain/`. `infrastructure/` and `presentation/` depend on `domain/` and `application/`.
- `@aws-sdk/*` only appears in `backend/libs/platform/adapters/aws`.
- Use enums for events, errors, permissions, queues and jobs. Never write those identifiers as string literals.
- Every new identifier is a UUIDv7 generated with the `IdGenerator` port.
- Every internal operation that changes data declares its compensation.
- Contracts are written in TypeScript with zod in `backend/libs/contracts/<service>`, with `enums`, `constants`, `types`, `schemas`, `http`, `internal` and `events` folders.
- A change in `backend/libs/contracts` requires regenerating the Dart in `front/packages/contracts` in the same change.
- Every client (backend or front) validates the request against the contract before calling over HTTP.
- A new architecture decision is recorded as an ADR in `docs/adr/`.
- Domain errors extend `DomainError` and use a code in the `SERVICE.SUBMODULE.ERROR` format.
- Front: every stateful screen has a controller and tests share `test_utils` ([ADR 0027](docs/adr/0027-patrones-de-pantalla-y-pruebas-del-front.md)).

## Git

- Branches prefixed with `feat/`, `fix/` or `chore/`.
- Conventional Commits in English, lowercase subject. The `commit-msg` hook validates them.
- Commit messages carry no AI attribution lines and no `Co-Authored-By` lines.
- Never commit a `.env` file. Document variables in `.env.example`.
- Never write secrets, tokens or passwords in code, tests or docs.
