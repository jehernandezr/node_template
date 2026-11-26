---
name: backend-code
description: 'Cross-cutting backend rules (TypeScript, NestJS): classes and injection, hexagonal, names, comments and review rules. Entry point for the backend-* skills.'
paths:
  - 'backend/**'
---

# Enterprise backend code

When creating files, folders, libraries or apps, load `backend-structure`; when touching modules, controllers or consumers, `backend-nestjs-composition`.

## Skill map

- Folders, aliases, build, file names: `backend-structure`.
- Aggregates, value objects, domain events: `backend-domain`.
- Use cases, NestJS modules, tokens, controllers: `backend-nestjs-composition`.
- Errors, codes, Problem Details: `backend-errors`.
- Entities, repositories, transactions, migrations: `backend-persistence-typeorm`.
- Outbox, consumers, idempotency, queues: `backend-messaging-idempotency`.
- Authentication, authorization, input, secrets: `backend-security`.
- Config, logs, traces, health, shutdown: `backend-observability-config`.
- Tests: `backend-testing`.

## Classes and injection

- All behavior goes in a class with one responsibility. No loose functions calling each other. Example in `references/classes.md`. <!-- id: backend-code.1 -->
- Collaborators through the constructor as `private readonly`, typed with the port. <!-- id: backend-code.2 -->
- Inheritance only for `DomainError`, `AggregateRoot`, `ValueObject` and stable bases such as `TenantIsolatedRepository`. <!-- id: backend-code.3 -->
- No `new` of dependencies in business code: they are wired in the NestJS module (see `backend-nestjs-composition`). <!-- id: backend-code.4 -->
- No singletons, module state or import side effects. <!-- id: backend-code.5 -->
- Exported functions only where `check-structure.mjs` allows them (see `backend-structure`). <!-- id: backend-code.6 -->
- Time and ids are injected (`Clock`, `IdGenerator`). Never `Date.now()`, `new Date()` or `randomUUID()` in business code. <!-- id: backend-code.7 -->

## Hexagonal

- `domain/`: aggregates, value objects, events, errors and ports. Depends only on `@platform/kernel`. <!-- id: backend-code.8 -->
- `application/`: one use case per class with `execute`, commands, queries, facades. Depends on `domain/`. <!-- id: backend-code.9 -->
- `infrastructure/`: port adapters (TypeORM, HTTP, queues, mappers). <!-- id: backend-code.10 -->
- `presentation/`: controllers, consumers, input schemas and the NestJS module. <!-- id: backend-code.11 -->
- A module does not import another module's internals: it uses its facade or its events. <!-- id: backend-code.12 -->
- Ports as abstract classes, small and in the domain language (`UserRepository.findByEmail`, not `findBy(filter: any)`). <!-- id: backend-code.13 -->
- I/O, randomness or general-purpose libraries enter the core only behind a port. <!-- id: backend-code.14 -->

## Names and code

- No abbreviations or empty suffixes (`Manager`, `Helper`, `Util`, `Data`). Details in `references/naming.md`. <!-- id: backend-code.15 -->
- No boolean behavior parameters: two methods or an enum. More than three parameters: a named object. <!-- id: backend-code.16 -->
- Enums for events, errors, permissions, queues, jobs and states. Never loose literals. <!-- id: backend-code.17 -->
- Named numeric constants (`MAX_SIGN_IN_ATTEMPTS`). <!-- id: backend-code.18 -->
- One file, one public class, with a role suffix. No `util.ts`, `types.ts`, `limits.ts`, `model.ts`. <!-- id: backend-code.19 -->
- Error classes end in `Error`. <!-- id: backend-code.20 -->
- An error is never caught to silence it (see `backend-errors`). <!-- id: backend-code.21 -->

## Comments and JSDoc

- No inline comments (`//` or `/* */`). If one seems needed, rename or extract a method. <!-- id: backend-code.22 -->
- JSDoc in English, complete and concise, on every public and port method: summary, `@param`, `@returns`, `@throws` with its code. <!-- id: backend-code.23 -->
- Public class: one JSDoc line with its role. Private methods without JSDoc. <!-- id: backend-code.24 -->
- JSDoc does not narrate implementation or process (plans, waves, task IDs) or repeat the name. <!-- id: backend-code.25 -->
- Exceptions: `// eslint-disable-next-line <rule> -- <reason>`, `// @ts-expect-error <reason>` and generated code (migrations, `export/`). <!-- id: backend-code.26 -->
- `comments/no-inline-comments` and `comments/require-public-jsdoc` (`backend/eslint.comments.mjs`, ADR 0038) enforce these rules in `nx lint`. A method that implements or overrides a port member is marked `override` (or implements an `implements` clause member) and is documented on the port. <!-- id: backend-code.27 -->
- JSDoc, identifiers and docs in English. Spanish JSDoc in a file you touch is translated entirely to English. <!-- id: backend-code.28 -->

## TypeScript

- `strict`. `eslint-disable` only with a reason. <!-- id: backend-code.29 -->
- `readonly` on properties, `ReadonlyArray` on public inputs and outputs. <!-- id: backend-code.30 -->
- Mutually exclusive states as a union discriminated by an enum, not two optionals. <!-- id: backend-code.31 -->
- Relative imports with `.js` (`nodenext`), `import type`, native modules with `node:`. <!-- id: backend-code.32 -->
- `async/await`, no floating promises, `return await` inside `try`. Only `Error` is thrown. <!-- id: backend-code.33 -->

## Review rules

Example in `references/examples.md`, section "Review rules".

A finding is proven with a run or with the diff line that breaks the rule.

## With pstack

Method in `pstack-in-node-template`. From pstack, these apply here: `typescript-best-practices`, `principle-boundary-discipline`, `architect`, `interrogate`, `blast-radius`, `no-comments`, `principle-prove-it-works`.
