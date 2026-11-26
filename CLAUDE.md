# Guide for AI agents

Rules for working in this repository. Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before touching the architecture.

## Language

- Everything developer-facing is written in English only: docs, ADRs, the plan, skills, agents, JSDoc and `///`, commits and PRs. One text, one language: no mixing. <!-- id: claude.language.1 -->
- User-facing product text keeps its locale (ARB files and their translations). <!-- id: claude.language.2 -->
- Text still in Spanish is translated whole when a change touches it. <!-- id: claude.language.3 -->

## Way of working: pstack

- All code work uses the pstack plugin: the method comes from pstack and the rules from `.claude/skills`. When they disagree, the repository wins. <!-- id: claude.way-of-working-pstack.1 -->
- Before starting, read the `pstack-in-node-template` skill. It explains how to load pstack skills in Claude Code: with `Read` on their `SKILL.md`, because the `Skill` tool rejects them. <!-- id: claude.way-of-working-pstack.2 -->
- The order is the `poteto-mode` playbook, `architect`, units with `tdd` and their own commit, verification with `principle-prove-it-works`, review with `interrogate`, `no-comments` and `blast-radius`, and `unslop` on docs, commits and PRs. <!-- id: claude.way-of-working-pstack.3 -->
- Use `swarm` for parallel work and `arena` to compare approaches. On the Raspberry Pi, run only one heavy command at a time. <!-- id: claude.way-of-working-pstack.4 -->

## Structure

- The root only holds `backend/`, `front/` (Flutter pub workspace), Nx as orchestrator and repository tooling (CI/CD, hooks, docs). See [ADR 0015](docs/adr/0015-repository-structure-and-shared-code.md). <!-- id: claude.structure.1 -->
- Each application owns its libraries: shared backend code lives in `backend/libs`, shared front code in `front/packages`, and code shared inside a service or microfrontend in its `shared/{enums,constants,types,utils}` folder. <!-- id: claude.structure.2 -->

## Commands

- Nx runs from the root and covers backend and front. Set up with `pnpm install` at the root and `flutter pub get` in `front/`. Examples: `pnpm nx affected -t lint test test-int typecheck build analyze format-check`, `pnpm nx test platform-saga`, `pnpm nx test front-shell_core`.
- A new service comes from `pnpm nx run generators:service -- --name=<n>` and a module from `pnpm nx run generators:module -- --service=<n> --name=<m>` ([ADR 0033](docs/adr/0033-generators-and-openapi.md)); a microfrontend from `front/tools/new_microfrontend.dart` (skill `front-new-microfrontend`). Backend libraries follow the `backend-structure` skill (an Nx project without `package.json`).
- Jest configs are `jest.config.cjs`.

## Code

- Code explains itself: no inline comments. Every public method has a complete, concise JSDoc (`///` in Dart). See `backend-code` and `front-analysis`. <!-- id: claude.code.1 -->
- Before writing, reviewing or merging code, load the skills in `.claude/skills`. They load by the folder you touch (`paths`); the entry point is `backend-code` for the backend and `front-code` for the front, and each links to the rest. <!-- id: claude.code.2 -->
- Classes, composition and constructor dependency injection. The only exported functions are stateless pure utilities and those listed in `check-structure.mjs` (contract `define*` factories, `env.ts` schemas and `secret()`, tool `main()`). No script-style modules of loose functions. <!-- id: claude.code.3 -->
- Persistence with TypeORM ([ADR 0024](docs/adr/0024-typeorm-persistence-sharding-persistent-sagas.md)): entities and migrations generated and applied with its CLI. `synchronize` is always off. <!-- id: claude.code.4 -->
- Backend: tests live in a `__tests__/` folder inside the folder of the code they test, never as a `.spec.ts` next to the source file. Integration tests end in `.int-spec.ts`; what another library needs from them is exported through `@platform/<lib>/test-utils`. Front: in each package's `test/`, mirroring the `lib/src` folders. <!-- id: claude.code.5 -->
- Backend: code goes directly in `src/`, without `src/lib/`. A single `node_modules`: libraries are imported through TypeScript aliases and have no `package.json`. <!-- id: claude.code.6 -->
- Relative imports in libraries end in `.js`, because the project uses ESM with `nodenext`. <!-- id: claude.code.7 -->
- Every port is an abstract class without decorators and is its own injection token. A library's NestJS wiring lives in `src/nest/` and is exported through `@platform/<lib>/nest`; outside that folder nothing imports `@nestjs/*` ([ADR 0025](docs/adr/0025-nestjs-layer-per-sub-entry-abstract-ports.md)). <!-- id: claude.code.8 -->
- Periodic tasks are classes that extend `ScheduledJob`, run by `@platform/scheduling` ([ADR 0026](docs/adr/0026-scheduled-jobs-scheduledjob-joblock.md)). No hand-rolled `setInterval` in a library. <!-- id: claude.code.9 -->
- The domain (`domain/`) does not import NestJS, TypeORM, AWS or other infrastructure libraries. It only depends on `kernel`. <!-- id: claude.code.10 -->
- `application/` depends on `domain/`. `infrastructure/` and `presentation/` depend on `domain/` and `application/`. <!-- id: claude.code.11 -->
- `@aws-sdk/*` only appears in `backend/libs/platform/adapters/aws`. <!-- id: claude.code.12 -->
- Use enums for events, errors, permissions, queues and jobs. Never write those identifiers as string literals. <!-- id: claude.code.13 -->
- Every new identifier is a UUIDv7 generated with the `IdGenerator` port. <!-- id: claude.code.14 -->
- Every internal operation that changes data declares its compensation. <!-- id: claude.code.15 -->
- Contracts are written in TypeScript with zod in `backend/libs/contracts/<service>`, with `enums`, `constants`, `types`, `schemas`, `http`, `internal` and `events` folders. <!-- id: claude.code.16 -->
- A change in `backend/libs/contracts` requires regenerating the Dart in `front/packages/contracts` in the same change. <!-- id: claude.code.17 -->
- Every client (backend or front) validates the request against the contract before calling over HTTP. <!-- id: claude.code.18 -->
- A new architecture decision is recorded as an ADR in `docs/adr/`. <!-- id: claude.code.19 -->
- Domain errors extend `DomainError` and use a code in the `SERVICE.SUBMODULE.ERROR` format. <!-- id: claude.code.20 -->
- Front: every stateful screen has a controller and tests share `test_utils` ([ADR 0027](docs/adr/0027-front-screen-patterns-and-tests.md)). <!-- id: claude.code.21 -->

## Git

- Branches prefixed with `feat/`, `fix/` or `chore/`. <!-- id: claude.git.1 -->
- Conventional Commits in English, lowercase subject. The `commit-msg` hook validates them. <!-- id: claude.git.2 -->
- Commit messages carry no AI attribution lines and no `Co-Authored-By` lines. <!-- id: claude.git.3 -->
- Never commit a `.env` file. Document variables in `.env.example`. <!-- id: claude.git.4 -->
- Never write secrets, tokens or passwords in code, tests or docs. <!-- id: claude.git.5 -->
