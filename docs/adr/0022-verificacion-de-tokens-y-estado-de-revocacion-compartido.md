# 0022. Token verification and shared revocation state

- Status: Accepted
- Date: 2026-11-13
- Revised: 2026-11-25 (identity replays the shared state from its own events and a permission version never goes back; see ADR 0036)

## Context

ADR 0005 decides that identity issues the tokens and the other services only verify them, checking signature, expiration, session, epochs and permission version. It remains to decide where that verification lives, where the services read the revocation state from and which claims the token needs to do it without calling identity. Today each service can only read Valkey keys with its own prefix (ADR 0020 and 0021), so no service would see a session revoked by identity.

## Decision

`backend/libs/platform/auth` (`@platform/auth`) verifies the access token and builds the `Actor` in any service, without NestJS. The HTTP entry point (`@platform/http`) uses it in its guard.

- ES256 signing and verification and JWKS with `node:crypto` (`dsaEncoding: 'ieee-p1363'`, JWK through `KeyObject`). No JWT library.
- Header `{ alg: 'ES256', typ: 'at+jwt', kid }`. Claims: `iss`, `aud`, `sub`, `tid`, `htid` (home tenant, ADR 0023), `sid`, `did`, `amr`, `auth_time`, `roles`, `proles` (platform roles), `pv` (`"<tenant version>.<user version>"`), `rgn`, `sxp` (absolute session cap), `iat`, `exp`, `jti`. The schema lives in `@contracts/identity`.
- Check order: format, signature, issuer and audience, expiration (`PLATFORM.AUTH.TOKEN_EXPIRED`), session cap, revoked session, user epoch, tenant epoch, permission version. The codes are those of `SessionGuardErrors`.
- Identity writes the revocation state in Valkey's `auth:*` space, without a service prefix: `auth:revoked:{sid}` with its index `auth:revoked-index`, `auth:epoch:user:{id}`, `auth:epoch:tenant:{id}`, `auth:pv:*`, `auth:access:{tid}:{uid}`, `auth:apikey:{prefix}` and the `auth:revocations` channel.
- The Valkey ACL of the `data` stack gives identity read and write on `auth:*`, and the other services only read (`%R~auth:*`) and subscription to `auth:revocations`.
- Identity writes each revocation and permission version right after the commit, and replays it from its own events (`SessionRevoked`, `TokensRevoked` with user scope and `PermissionsChanged`) through the `identity-auth-state` queue. The write after the commit is the fast path; the replay is the one that survives a Valkey outage or a crash between the commit and that write. A permission version is only raised (a Lua script in Valkey), and an epoch replay never moves the cut-off back, so late or repeated writes are harmless.
- Each process keeps an in-memory Bloom of revoked sessions, fed by the channel and rebuilt every 10 s from the index, and a 5 s local cache for epochs and versions. If Valkey does not respond and there is no cached value, the verifier answers 503 instead of accepting the token.
- `@platform/auth` and `@platform/http` may import `@contracts/identity` (explicit exception in `backend/eslint.config.mjs`): the token format and its codes are identity's contract.

## Implementation in identity

- The `tokens` module signs with the active key of `IDENTITY_SIGNING_KEYS` and publishes at `GET /v1/auth/jwks` the active key and the verification keys, with `Cache-Control: public, max-age=300`. Planned and emergency rotation are in the [key runbook](../runbooks/rotacion-claves-identity.md).
- A valid API key is copied to `auth:apikey:{prefix}` for 60 s (or until it expires or its rotation grace period ends) and revoking it deletes the copy. A CIDR-restricted key is never copied: whoever reads the copy does not know the client's IP, and without an IP identity rejects it (`IDENTITY.API_KEY.IP_NOT_ALLOWED`). Failures count by prefix and IP with the sign-in lockout rules, and the last use is accumulated in Valkey and flushed by a job.
- Routes take their access from the contract. The [access matrix](../identity/matriz-de-acceso.md) is generated from `@contracts/identity`, a test fails if a public route is not approved and the `access-matrix.e2e-spec.ts` e2e walks every route with a session without a token, without permission and without recent MFA.

## Consequences

### Positive

- No service calls identity to authenticate a request.
- A revocation reaches every process in milliseconds through the channel, and in at most 10 s if a process missed the notice.
- A single verifier for HTTP, consumers and the real-time gateway.

### Costs

- The `auth:*` space breaks the "each service sees only its prefix" rule; it is limited to reads.
- The new claims (`htid`, `proles`, `pv` as a pair, `sxp`) extend what the plan lists.
- Maintaining in-house cryptographic code requires test vectors from the RFCs and tampered-token cases.

## Alternatives considered

- Each service consumes `TokensRevoked` from its queue and keeps a copy under its prefix: the queue delivers to a single consumer per service and the revocation has to reach every process.
- Introspection in identity per request: it adds latency and makes identity a single point of failure.
- The `jose` library: correct, but `node:crypto` covers ES256 and JWK with little in-house code.
