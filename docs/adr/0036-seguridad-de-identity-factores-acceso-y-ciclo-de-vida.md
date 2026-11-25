# 0036. Identity security: factors, access and lifecycle

- Status: Accepted
- Date: 2026-11-25
- Related: [ADR 0005](0005-autenticacion-sesiones-jwt.md), [ADR 0006](0006-mfa-dispositivo-registrado-passkeys.md), [ADR 0022](0022-verificacion-de-tokens-y-estado-de-revocacion-compartido.md), [ADR 0031](0031-reportes-facturacion-y-sagas-de-identity.md)
- Amends: ADR 0031 on the deletion of the last owner of a tenant

## Context

The general review of 2026-11-24 found ways around the second factor and the permission ceiling of identity, and lifecycle gaps that lock users out or leave access behind:

- The sign-in recognized a registered device by its public id alone, which anyone who has seen an old access token can build.
- A passkey without user verification could be both factors of the same sign-in.
- An API key handed out the permissions of its service account without checking that its creator held them.
- A removed and re-invited member started at permission version 1, below the version the removal published, so every token was stale forever.
- Discarding a tenant left its memberships, roles, groups and the projection of its owner, and "my tenants" failed for good.
- Several writes that decide access (revocation marks, permission versions, the session rotation, the reset of a password, the move of an email) could be lost or committed half way.

## Decision

### Factors

- A sign-in recognizes a device only from an ES256 signature of its key over the route, the public device id, a timestamp, a single-use nonce and a value of the request (the email, or the WebAuthn challenge id). The contract replaces the bare `deviceId` with `device: DeviceSignatureFields` in `SignInRequest` and `PasskeySignInVerifyRequest`. A proof that does not verify is not an error: the device is unknown and a second factor is asked.
- One factor never counts twice: the factor of the first step is never offered as the second one, and a passkey used as a second factor or for step-up must verify the user. A passkey step-up completes only for the session that started it, and a deleted account cannot sign in with a passkey.
- Wrong second-factor codes count per user across challenges (ten in fifteen minutes). Step-up, invitations, email change and tenant creation use the sensitive rate limit tier.
- A recovery without a device expires three days after it becomes available, is cancelled when the user proves a second factor, doubles its wait at most twice, and spends the pending sign-in once.

### Sessions and shared state

- The refresh checks the user and the tenant and signs the access token before it rotates, and a retry within the grace receives the current session token.
- A password reset redeems the token, stores the password and revokes every session in one transaction.
- Identity replays session revocations, user revocations and permission versions from its own events through the `identity-auth-state` queue; the write right after the commit stays as the fast path. A permission version is only ever raised.

### Access

- Issuing or rotating an API key requires the caller to hold every permission of its service account, and only an active key rotates.
- A removed member stays as a soft-deleted row of `tenant_members` that keeps the last permission version it published. A later membership of that user starts one above it and publishes it. The erasure of an account deletes the row for good.
- Accepting an invitation checks again that its inviter, member or active service account, can still grant its groups, and counts the seats of the plan under the lock of the tenant, so concurrent acceptances never go past the limit.
- Inviting, removing a member, changing groups or roles and editing service accounts require a recent MFA, like API keys already did.
- The member list is paginated by user id.

### Lifecycle

- Discarding a tenant deletes, before its row, the projections of its members and then its memberships, groups, roles and versions, so a repetition after a partial run finishes the job. "My tenants" leaves out a projection whose tenant no longer exists.
- The last owner of a tenant with other members cannot delete their account until they hand over ownership (`IDENTITY.ACCESS.LAST_OWNER`). A tenant where the owner is the only member is left without members. This amends ADR 0031, which let the deletion go through without another owner.
- The erasure of an account also deletes its sessions (IP and user agent), its sign-in history and its second factors.
- An email change moves the catalog entry back if the user shard fails, and a move that finds no entry is not a success.

## Consequences

### Positive

- A stolen password needs a device key, not an id, to skip the second factor, and no factor counts twice.
- Nobody hands out permissions they do not hold, neither through an API key nor through an invitation accepted later.
- A returning member, a discarded tenant and a deleted owner no longer leave the system in a state that only manual repair fixes.
- A Valkey outage delays a revocation instead of losing it.

### Costs

- The app must sign the sign-in with its device key; until the front sends the proof every sign-in from a new session asks for a second factor.
- `tenant_members` keeps one soft-deleted row per removed member, and the new queue adds a consumer to identity.
- A tenant whose only member deletes their account stays without members until a lifecycle job retires it.

### Pending

- The `EmailChanged` alert still goes to the new address: notifications resolves the recipient from the current email, and sending it to the old address needs a template and a recipient in notifications.
- `audit_log` is append-only and keeps the email and name of an erased user, and pending invitations keep the invited email; scrubbing them needs a platform decision on audited columns and a cross-shard sweep.
- The password reset request and the sign-in still differ in timing between existing and unknown emails (an outbox write and a `login_attempts` row); the reset email is still sent synchronously.
- Per-purpose subkeys for `IDENTITY_TOKEN_PEPPER` with a `kid`, the `@Global` modules with their cycles, the scattered authorization and the anemic access domain belong to the structural cycle.

## Alternatives considered

- A separate tombstone table for removed members: it needs its own migration, isolation and relocation entry, while the soft delete column already exists and TypeORM reads hide it.
- Retrying the write to Valkey after the commit: it covers a blip but not a crash or a long outage, which the outbox already covers.
- Refusing every account deletion of an owner: it would keep a person who is the only member of their tenant from erasing their data.
