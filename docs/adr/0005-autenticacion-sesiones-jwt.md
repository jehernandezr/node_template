# 0005. In-house authentication with sessions and JWT

- Status: Accepted
- Date: 2026-11-11
- Revised: 2026-11-14 (F4 design, section 11: the cookie is named `__Host-session`; the mobile app declares its channel with `Authorization: Bearer <session token>` or `X-Session-Transport: bearer` and only then receives the token in the body; the password has a minimum of 12 characters)
- Revised: 2026-11-25 (the refresh checks and signs before it rotates, and a retry within the grace receives the current session token; see ADR 0036)

## Context

The original template stores secrets in the repository, accepts the role from the signup body, reads the password before validating the user and stores passwords without a hash. The platform needs its own identity that can revoke sessions without waiting for a token to expire.

## Decision

The `identity` service issues and controls all identity. The other services only verify.

- Access token: ES256 JWT lasting 10 to 15 minutes, verifiable statelessly with the public key from the JWKS.
- Session token: opaque, stored as a hash in the `sessions` table. Each refresh rotates it, and reusing an earlier one revokes the whole session. The refresh checks the user and the tenant and signs the new access token before the rotation commits, so a failure never leaves the client without the new generation. The previous generation, presented within the 5 s grace, receives the current session token instead of a second rotation.
- Expiry: the session expires after 1 day without activity. Each refresh extends the window by one day, with an absolute cap of 30 days.
- Passwords with argon2id. Changing the password revokes the other sessions; confirming a reset revokes all of them in the same transaction that stores the new password.
- On web, the session token goes in an `httpOnly`, `Secure` and `SameSite=Strict` cookie. On mobile, it goes in Keychain or Keystore.
- The guard checks, in order, the signature, the expiry, the session, the user and tenant epochs, and the permissions version.

### Contract routes

The `@contracts/identity` contract publishes the session lifecycle:

- `POST /v1/auth/refresh` (`identity.auth.refresh`, public): receives `{ sessionToken? }` and responds with `SessionTokens`. On mobile the session token travels in the body and the response carries the next one. On web the body is empty, the token travels in the cookie, the server replaces it with `Set-Cookie` and the response does not carry `sessionToken`.
- `POST /v1/auth/sign-out` (`identity.auth.sign-out`, public): receives the same `{ sessionToken? }`, revokes the session, clears the cookie on web and responds 204. It is idempotent.
- Step-up of an open session, with the login MFA types and authenticated access: `POST /v1/me/step-up` responds with `PendingMfa` with an `mfaToken` bound to the session and the methods it offers; `POST /v1/me/step-up/challenges` receives `MfaChallengeRequest` and responds with `MfaChallenge`; `POST /v1/me/step-up/verify` receives `StepUpVerifyRequest` (without a device key) and responds with `StepUpResult`, with a new access token carrying up-to-date `auth_time` and `amr` and the session's new `mfaVerifiedAt`. The session token does not change.

### Invalidation codes

Each invalidation mechanism has its public code, with a message in es and en:

| Code                        | HTTP | When                                                                                      |
| --------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| `IDENTITY.SESSION.REVOKED`  | 401  | The session was revoked (logout, remote sign-out, password change, administrator action). |
| `IDENTITY.SESSION.EXPIRED`  | 401  | The session expired due to inactivity or the absolute cap.                                |
| `IDENTITY.SESSION.REUSED`   | 401  | An already rotated session token was presented; the whole session is revoked.             |
| `IDENTITY.TOKEN.REVOKED`    | 401  | The access token falls under the user or tenant epoch.                                    |
| `IDENTITY.USER.SUSPENDED`   | 403  | The user is suspended.                                                                    |
| `IDENTITY.TENANT.SUSPENDED` | 403  | The tenant is suspended.                                                                  |

The refresh responds with the session codes and the suspensions. The guard of every authenticated route responds with the revoked or expired session, the revoked token, the suspensions and `IDENTITY.TOKEN.STALE_PERMISSIONS`. The client signs out on any of the six, whether from the refresh or from another route; on `STALE_PERMISSIONS` it refreshes and retries. A method that the MFA challenge did not offer responds with `IDENTITY.MFA.METHOD_UNAVAILABLE` (400).

## Consequences

Positive:

- A session can be revoked instantly, even if the access token remains valid until its `exp`.
- The platform does not depend on an external identity provider.

Costs:

- The platform is responsible for key rotation, lockout after failed attempts and token invalidation.
- The guard queries Valkey on every request. This is mitigated with a cache of a few seconds and a Bloom filter in front.

## Alternatives considered

- Auth from the original template (JWT, Sequelize and bcrypt): discarded because of the security findings listed in the starting point.
