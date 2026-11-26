---
name: backend-errors
description: 'Backend errors: SERVICE.SUBMODULE.ERROR codes, failure classification, catalog and Problem Details. Use it when throwing, catching or translating an error.'
paths:
  - 'backend/**/errors/**'
  - 'backend/**/*.error.ts'
  - 'backend/libs/contracts/**/errors/**'
---

# Errors

The client reacts to the `code`. The `message` is for people and carries no input values.

- Domain: thrown by aggregates and domain services; reaches the client with its public code.
- Infrastructure (`connection refused`, `23505`): never crosses as is; it is translated or is a 500.
- Programming (`TypeError`, broken invariant): 500 with `traceId`.

## Domain errors

- Extend `DomainError` with a `code` from a service enum in the `SERVICE.SUBMODULE.ERROR` format. The enums live in `@contracts/<service>` (`enums/`). <!-- id: backend-errors.1 -->
- One class per rule. Never `throw new Error('...')` in business code. <!-- id: backend-errors.2 -->
- `details` without sensitive data (ids and limits yes; emails and passwords no). <!-- id: backend-errors.3 -->
- Not retryable by default; a concurrency conflict is (`retryable: true`). <!-- id: backend-errors.4 -->
- New code: it goes into the enum and into `<service>ErrorCatalog` with `httpStatus`, `retryable`, `audience` and `description`, and the front Dart is regenerated in the same change. The catalog test fails if an entry is missing. <!-- id: backend-errors.5 -->
- Business failures as `DomainError`. Where the caller decides by branching (sagas, batches), a kernel `Result<T, E>` may be returned. A method does not mix both. <!-- id: backend-errors.6 -->
- Input validation accumulates field errors (`PLATFORM.VALIDATION.INVALID_INPUT` with `details.fieldErrors`). Domain guards fail on the first one. <!-- id: backend-errors.7 -->

## Infrastructure errors

- The adapter translates its library's error to a domain error or to a `PlatformError` with `cause`. <!-- id: backend-errors.8 -->
- `23505` is translated to the business rule. Version conflict to a retryable `ConcurrencyConflictError`. `40P01` and `40001` to retryable. <!-- id: backend-errors.9 -->
- Classified with `FailureKind` and `FailureClassifier` from `@platform/primitives` (`classify`, `isTransient`), to which each adapter adds rules: `Transient` is retried with backoff, `Permanent` is not, `ProtocolViolation` never. <!-- id: backend-errors.10 -->
- The cause is kept: `new XError(message, details, { cause })`. <!-- id: backend-errors.11 -->

## Problem Details

- A global filter translates everything with `toProblemDetails` from `@contracts/platform` to `application/problem+json`. It is registered with `APP_FILTER` in the platform module to inject `LoggerPort` and the catalog. Sketch in `references/problem-details-filter.md`. <!-- id: backend-errors.12 -->
- Body: `type`, `title`, `status`, `code`, `detail`, `traceId` and, when applicable, `fieldErrors`. <!-- id: backend-errors.13 -->
- `internal` audience or unknown error: `PLATFORM.INTERNAL.UNEXPECTED` and `traceId`, without message or stack. <!-- id: backend-errors.14 -->
- Statuses: validation 400, unauthenticated 401, no permission 403, not found 404, conflict 409, invalid state 422, rate 429, dependency down 503. They come from the catalog, not from the controller. <!-- id: backend-errors.15 -->
- The domain and the application never throw `HttpException`. <!-- id: backend-errors.16 -->
- If knowing that the resource exists is sensitive, 404 instead of 403. <!-- id: backend-errors.17 -->

## Consumers and jobs

- One handler per trigger type that classifies, logs with `traceId`, counts a metric and decides. <!-- id: backend-errors.18 -->
- Consumer: `Permanent` or contract errors to the DLQ; `Transient` is retried with the platform backoff. <!-- id: backend-errors.19 -->
- Job: an uncaught error does not bring the process down, but it alerts. <!-- id: backend-errors.20 -->
- `unhandledRejection` or `uncaughtException`: logged and the process exits cleanly. <!-- id: backend-errors.21 -->

## Tests

Check the `code`: `await expect(promise).rejects.toMatchObject({ code: IdentityErrorCode.EmailAlreadyRegistered })`. No `try/catch`.

## With pstack

Method in `pstack-in-node-template`. From pstack, these apply here: `principle-boundary-discipline`, `principle-fix-root-causes`, `principle-make-operations-idempotent`.
