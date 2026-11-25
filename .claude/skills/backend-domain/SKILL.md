---
name: backend-domain
description: 'Backend domain modeling: aggregates, value objects, events, ports and domain errors on top of @platform/kernel. Use it in domain/.'
paths:
  - 'backend/**/domain/**'
  - 'backend/libs/platform/kernel/**'
---

# Domain

Pure TypeScript: it only imports `@platform/kernel`. No NestJS, TypeORM, zod, AWS or `process.env`. `User` and `Email` examples in `references/examples.md`.

## Aggregates

- Loaded, changed and saved whole in one transaction. Access only through the root.
- Small aggregates. References to others by id (`ownerId: Id`), never by object.
- Private constructor and two factories: `register(...)` validates, creates and emits an event; `rehydrate(...)` rebuilds without validating or emitting.
- No public setters: methods with business names that check the rule before mutating.
- `id` and `createdAt` are `readonly`.
- Receives `now` and the event ids as parameters; the use case gets them from `Clock` and `IdGenerator`.
- A rule that needs other aggregates or the database goes in a domain service (a class with ports in `domain/`) or in the use case.
- Uniqueness: checked in the use case with the repository and guaranteed with a unique index. The repository translates the duplicate to `EmailAlreadyRegisteredError`.

## Value objects

- Extend `ValueObject`. Immutable, equal by value, private constructor and `Email.create(raw)` that throws the domain error.
- Only for primitives with rules: `Email`, `Money`, `PasswordHash`, `TenantId`.
- Money: an integer in the minor unit plus a currency.
- They never travel in DTOs, events or ORM entities: they are serialized to primitives at the boundary.
- Ids: the kernel `Id` (UUIDv7). Created with `IdGenerator` or parsed with `Id.from(raw)`. The event `aggregateId` is `id.value`.
- Simple validation in the domain; zod validates complex formats at the edge.

## Domain events

- A fact in past tense, emitted with `addDomainEvent`. Type from one enum per aggregate (`UserEventType.Registered = 'identity.user.registered'`).
- `payload` of primitives, minimal and without sensitive data.
- The use case takes them with `pullDomainEvents()` after saving and hands them to the outbox in the same transaction (see `backend-messaging-idempotency`).
- What leaves the service is a versioned integration event with a zod schema in `@contracts/<service>` (`events/`), translated in an application mapper.

## Ports

- An abstract class in `domain/` that serves as contract and token (see `backend-nestjs-composition`).
- Repository ports speak in aggregates: `save(user)`, `findById(id)`.
- Available platform ports: `Clock`, `IdGenerator`.

## Errors and queries

- Each broken rule is a class extending `DomainError` with a code from the service enum (see `backend-errors`).
- Reads without rules may read from the replica with `QueryBuilder` and return a read DTO, never ORM entities.
- The domain is tested without doubles or NestJS (see `backend-testing`).

## With pstack

Method in `pstack-in-node-template`. From pstack, these apply here: `principle-model-the-domain`, `principle-foundational-thinking`, `principle-type-system-discipline`, `principle-boundary-discipline`, `architect`. Where `principle-boundary-discipline` asks for pure functions, here they are domain classes without framework dependencies.
