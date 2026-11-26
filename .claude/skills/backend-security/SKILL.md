---
name: backend-security
description: 'Backend security: zod at the edge, JWT and sessions, permissions and tenants, secrets, limits, SQL and personal data. Use it when exposing an endpoint or handling credentials.'
paths:
  - 'backend/**/presentation/**'
  - 'backend/libs/platform/auth/**'
  - 'backend/libs/platform/http/**'
  - 'backend/libs/contracts/**/http/**'
  - 'backend/apps/identity/**'
---

# Security

Context: ADR 0005 (authentication), 0006 (MFA), 0010 (sharding by tenant), 0016 (egress), 0022 (token revocation). These rules add to them.

## Input

- Every piece of data that crosses a boundary (HTTP, message, job, environment variable) is validated with the contract zod schema before use. <!-- id: backend-security.1 -->
- Strict schemas: `z.strictObject` to reject unknown fields, maximum lengths on strings, limits on numbers and arrays, `uuid` for ids. <!-- id: backend-security.2 -->
- Allowlist on input and output. An endpoint never returns a full entity: it builds the DTO field by field, so a new field does not leak by accident. <!-- id: backend-security.3 -->
- Maximum body and payload size per route. File uploads have their MIME type and size validated and are stored outside the application server. <!-- id: backend-security.4 -->
- No `eval`, `new Function` or `require` with a variable path. No regular expressions with catastrophic backtracking on user input (validate the length first). <!-- id: backend-security.5 -->
- Redirects only to destinations on an allowlist. Network egress goes through the platform client with an allowlist (ADR 0016) to prevent SSRF. <!-- id: backend-security.6 -->

## Authentication

- Passwords with Argon2id (or scrypt) through a `PasswordHasher` port, with the cost in configuration. Constant-time comparison. Never MD5, plain SHA or reversible encryption. <!-- id: backend-security.7 -->
- Short-lived JWT, with `iss`, `aud`, `exp`, `rgn` and the tenant. The algorithm is fixed at verification, never taken from the token header. Keys rotate with `kid`. <!-- id: backend-security.8 -->
- Revocation through shared state (ADR 0022). The refresh token is opaque, 256 random bits (`crypto.randomBytes`), stored as a hash and rotated on every use. <!-- id: backend-security.9 -->
- Brute force: rate limit per account and per IP on login, progressive lockout and an identical response for a nonexistent user and a wrong password. <!-- id: backend-security.10 -->
- MFA and registered devices per ADR 0006. <!-- id: backend-security.11 -->

## Authorization

- Deny by default. A global guard requires authentication; a public route is declared with an explicit decorator. <!-- id: backend-security.12 -->
- Permissions are an enum (`Permission.UsersWrite`), never strings. They are declared per route with a decorator and a guard evaluates them. <!-- id: backend-security.13 -->
- Object authorization is checked in the use case, with the actor and the resource: having the `UsersWrite` permission is not enough to write a user from another tenant. <!-- id: backend-security.14 -->
- The tenant comes from the verified token, never from a client parameter, body or header. Every query carries the shard key of the actor's tenant. <!-- id: backend-security.15 -->
- Access to someone else's resource responds 404 if its existence is sensitive, 403 otherwise. <!-- id: backend-security.16 -->
- Sensitive actions (email change, permissions, deletion) emit an audit event with actor, tenant, resource and trace. <!-- id: backend-security.17 -->

## Data

- Queries are always parameterized, with TypeORM or `QueryBuilder` with named parameters. Never concatenate input into SQL, not even into column names or ordering: the order is picked from an allowlist. <!-- id: backend-security.18 -->
- Sensitive columns (ID documents, phone numbers) are encrypted at field level with KMS-managed keys, and search indexes use HMAC, not the value. <!-- id: backend-security.19 -->
- Secrets, tokens and personal data never go in logs, error messages, URLs, traces or domain events. The logger redacts known fields (`password`, `token`, `authorization`). <!-- id: backend-security.20 -->
- UUIDv7 values reveal their creation time. For public identifiers where that matters, add an opaque identifier. <!-- id: backend-security.21 -->

## Secrets and configuration

- Secrets come from Secrets Manager or the environment, are read once at startup by the validated configuration and are injected as a value. Never in the repository, in tests or in images. <!-- id: backend-security.22 -->
- `.env.example` documents variables without real values. <!-- id: backend-security.23 -->
- Tests use generated values, never real ones. <!-- id: backend-security.24 -->

## Transport and headers

- HTTPS only. CORS with an explicit list of origins, never `*` with credentials. <!-- id: backend-security.25 -->
- Security headers with `helmet` (or the Fastify equivalent). No `X-Powered-By`. <!-- id: backend-security.26 -->
- Global rate limit plus one per sensitive route, with a 429 response and `Retry-After`. <!-- id: backend-security.27 -->
- Errors do not reveal technology, paths or queries: see `backend-errors`. <!-- id: backend-security.28 -->

## Dependencies and runtime

- Exact versions and `pnpm install --frozen-lockfile` in CI. Vulnerability scanning in CI. Few dependencies, each behind a port (see `backend-structure`). <!-- id: backend-security.29 -->
- Container with an unprivileged user, minimal image, no secrets in `ARG` or in layers. <!-- id: backend-security.30 -->
- `@aws-sdk/*` only in `backend/libs/platform/adapters/aws`, with least-privilege roles per service. <!-- id: backend-security.31 -->

## Review

```
- [ ] Strict zod schema at every new edge
- [ ] Permission by enum plus object and tenant check in the use case
- [ ] Response built with an allowlist
- [ ] No SQL by concatenation
- [ ] No secrets or personal data in logs
- [ ] Rate limit on credential or expensive routes
- [ ] Audit event on sensitive actions
```

## With pstack

Method in `pstack-in-node-template`. From pstack these apply here: `interrogate`, `blast-radius`, `principle-boundary-discipline`, `principle-type-system-discipline`.
