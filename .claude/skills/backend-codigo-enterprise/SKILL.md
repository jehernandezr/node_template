---
name: backend-codigo-enterprise
description: 'Cross-cutting backend rules (TypeScript, NestJS): classes and injection, hexagonal, names, comments and review rules. Entry point for the backend-* skills.'
paths:
  - 'backend/**'
---

# Enterprise backend code

When creating files, folders, libraries or apps, load `backend-estructura`; when touching modules, controllers or consumers, `backend-nestjs-composicion`.

## Skill map

- Folders, aliases, build, file names: `backend-estructura`.
- Aggregates, value objects, domain events: `backend-dominio`.
- Use cases, NestJS modules, tokens, controllers: `backend-nestjs-composicion`.
- Errors, codes, Problem Details: `backend-errores`.
- Entities, repositories, transactions, migrations: `backend-persistencia-typeorm`.
- Outbox, consumers, idempotency, queues: `backend-mensajeria-idempotencia`.
- Authentication, authorization, input, secrets: `backend-seguridad`.
- Config, logs, traces, health, shutdown: `backend-observabilidad-configuracion`.
- Tests: `backend-pruebas`.

## Classes and injection

- All behavior goes in a class with one responsibility. No loose functions calling each other. Example in `references/clases.md`.
- Collaborators through the constructor as `private readonly`, typed with the port.
- Inheritance only for `DomainError`, `AggregateRoot`, `ValueObject` and stable bases such as `ShardedRepository`.
- No `new` of dependencies in business code: they are wired in the NestJS module (see `backend-nestjs-composicion`).
- No singletons, module state or import side effects.
- Exported functions only where `check-structure.mjs` allows them (see `backend-estructura`).
- Time and ids are injected (`Clock`, `IdGenerator`). Never `Date.now()`, `new Date()` or `randomUUID()` in business code.

## Hexagonal

- `domain/`: aggregates, value objects, events, errors and ports. Depends only on `@platform/kernel`.
- `application/`: one use case per class with `execute`, commands, queries, facades. Depends on `domain/`.
- `infrastructure/`: port adapters (TypeORM, HTTP, queues, mappers).
- `presentation/`: controllers, consumers, input schemas and the NestJS module.
- A module does not import another module's internals: it uses its facade or its events.
- Ports as abstract classes, small and in the domain language (`UserRepository.findByEmail`, not `findBy(filter: any)`).
- I/O, randomness or general-purpose libraries enter the core only behind a port.

## Names and code

- No abbreviations or empty suffixes (`Manager`, `Helper`, `Util`, `Data`). Details in `references/nombres.md`.
- No boolean behavior parameters: two methods or an enum. More than three parameters: a named object.
- Enums for events, errors, permissions, queues, jobs and states. Never loose literals.
- Named numeric constants (`MAX_SIGN_IN_ATTEMPTS`).
- One file, one public class, with a role suffix. No `util.ts`, `types.ts`, `limits.ts`, `model.ts`.
- Error classes end in `Error`.
- An error is never caught to silence it (see `backend-errores`).

## Comments and JSDoc

- No inline comments (`//` or `/* */`). If one seems needed, rename or extract a method.
- JSDoc in English, complete and concise, on every public and port method: summary, `@param`, `@returns`, `@throws` with its code.
- Public class: one JSDoc line with its role. Private methods without JSDoc.
- JSDoc does not narrate implementation or process (plans, waves, task IDs) or repeat the name.
- Exceptions: `// eslint-disable-next-line <rule> -- <reason>`, `// @ts-expect-error <reason>` and generated code (migrations, `export/`).
- JSDoc, identifiers and docs in English. Spanish JSDoc in a file you touch is translated entirely to English.

## TypeScript

- `strict`. `eslint-disable` only with a reason.
- `readonly` on properties, `ReadonlyArray` on public inputs and outputs.
- Mutually exclusive states as a union discriminated by an enum, not two optionals.
- Relative imports with `.js` (`nodenext`), `import type`, native modules with `node:`.
- `async/await`, no floating promises, `return await` inside `try`. Only `Error` is thrown.

## Review rules

Example in `references/ejemplos.md`, section "Review rules".

A finding is proven with a run or with the diff line that breaks the rule.

## With pstack

Method in `pstack-en-node-template`. From pstack, these apply here: `typescript-best-practices`, `principle-boundary-discipline`, `architect`, `interrogate`, `blast-radius`, `no-comments`, `principle-prove-it-works`.
