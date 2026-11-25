# 0003. UUIDv7 identifiers and traceId

- Status: Accepted
- Date: 2026-11-11

## Context

The services generate events, sagas, jobs and audit records that must be identified without depending on the database. In addition, paginated queries and indexes benefit from identifiers that grow over time, and tracing needs an identifier compatible with OpenTelemetry and X-Ray.

## Decision

Every identifier is a UUIDv7: users, tenants, sessions, devices, events, sagas, jobs, files, invoices and the `traceId`.

- The application generates the ID with `UuidV7IdGenerator` (on `node:crypto`, port `IdGenerator`) before persisting the entity. The column is `uuid` and it is the primary key.
- The `traceId` is a UUIDv7 generated on entry to the system. Its 128 bits without hyphens form a valid W3C trace-id inside `traceparent`.
- Pagination uses the ID as the cursor (`?after=<id>`).
- Secrets (refresh tokens, `mfaToken`, OTP, reset tokens and API keys) do not use UUIDv7. They use 256 random bits from `crypto.randomBytes`.

## Consequences

Positive:

- The entity has an identity before it is saved, which simplifies events and sagas.
- PostgreSQL indexes grow in order and the ID works as a cursor.
- The `traceId` can be used as is in `traceparent` and in X-Ray.

Costs:

- A UUIDv7 reveals its creation time to the millisecond. This has to be taken into account for public IDs where that time is sensitive.

## Alternatives considered

The document does not record alternatives evaluated for the identifier format.
