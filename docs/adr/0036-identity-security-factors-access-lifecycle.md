# 0036. Identity security: factors, access and lifecycle

- Status: Accepted
- Date: 2026-11-25
- Related: [ADR 0005](0005-authentication-sessions-jwt.md), [ADR 0006](0006-mfa-registered-device-passkeys.md), [ADR 0022](0022-token-verification-shared-revocation-state.md), [ADR 0031](0031-reports-billing-identity-sagas.md)
- Amends: ADR 0031 on the deletion of the last owner of a tenant

## Context

The general review of 2026-11-24 found ways around the second factor and the permission ceiling of identity, and lifecycle gaps that lock users out or leave access behind:

- The sign-in recognized a registered device by its public id alone, which anyone who has seen an old access token can build.
- A passkey without user verification could be both factors of the same sign-in.
- An API key handed out the permissions of its service account without checking that its creator held them.
- A removed and re-invited member started at permission version 1, below the version the removal published, so every token was stale forever.
- Discarding a tenant left its memberships, roles, groups and the projection of its owner, and "my tenants" failed for good.
- Several writes that decide access (revocation marks, permission versions, the session rotation, the reset of a password, the move of an email) could be lost or committed half way.
- Two owners who asked to delete their accounts one right after the other could both pass the last-owner check and leave the other members without an owner.
- The password reset request and a failed sign-in did more work for an existing email than for an unknown one, which let anyone tell which emails have an account.

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
- The cut-off of a user epoch moves up with one atomic Valkey script (`AuthStateWriter.raiseUserRevocation`) that keeps the stored suspension, so a revocation never loses a suspension written at the same time.

### Access

- Issuing or rotating an API key requires the caller to hold every permission of its service account, and only an active key rotates.
- A removed member stays as a soft-deleted row of `tenant_members` that keeps the last permission version it published. A later membership of that user starts one above it and publishes it. The erasure of an account deletes its rows for good: the current ones tenant by tenant, and the soft-deleted ones of earlier removals in every shard, in a maintenance transaction that is repeated until every shard answers.
- Accepting an invitation checks again that its inviter, member or active service account, can still grant its groups, and counts the seats of the plan under the lock of the tenant, so concurrent acceptances never go past the limit.
- Inviting, removing a member, changing groups or roles and editing service accounts require a recent MFA, like API keys already did.
- The member list is paginated by user id with a keyset query that reads only the page and one more row.

### Lifecycle

- Discarding a tenant deletes, before its row, the projections of its members and then its memberships, groups, roles and versions, so a repetition after a partial run finishes the job. "My tenants" leaves out a projection whose tenant no longer exists.
- The last owner of a tenant with other members cannot delete their account until they hand over ownership (`IDENTITY.ACCESS.LAST_OWNER`). A tenant where the owner is the only member is left without members. This amends ADR 0031, which let the deletion go through without another owner.
- Starting a deletion reserves the departure of the user under the lock of each tenant: it checks the rule and sets `tenant_members.leaving_since`. A member who is leaving no longer counts as an owner but still counts as a member, so two owners who ask at the same time cannot both leave, and an editor cannot demote the only owner who stays. A refusal in one tenant or a saga that does not start gives back only the departures that request reserved, so a repeated request that fails leaves those of an earlier deletion still in flight. The reactivation of the user gives every departure back.
- Nobody but a new owner joins a tenant whose every owner is leaving: accepting an invitation to any other group answers `IDENTITY.INVITATION.INVALID`. Letting the member in would leave the tenant with a member and without an owner once the departure completes, and the erasure of the last owner would stop after its pivot.
- The erasure removes the user from their tenants before anything else of identity and checks the rule again under the lock, so a tenant is never left with members and without an owner; if it would be, the step fails and the saga stops.
- The erasure of an account also deletes its sessions (IP and user agent), its sign-in history and its second factors.
- An email change moves the catalog entry back if the user shard fails, and a move that finds no entry is not a success.

### Enumeration

- A password reset request only sends `identity.password-reset.send.v1` to the `identity-password-resets` queue through the outbox of the default tenant shard and answers 202. It never looks up the email, so the answer, its cost and the rows it writes are the same whether or not an account exists. The worker looks up the account and, if it can reset its password, issues the token and asks notifications for the email. The command carries the email and stays inside identity; the token never goes through the bus. The email is the typed one, also when no account has it, because the worker needs it to look up the account.
- A failed sign-in with an email without an account is recorded in `login_attempts` without a user, in the shard of the default tenant, so a failure writes one row whether or not the account exists.

## Consequences

### Positive

- A stolen password needs a device key, not an id, to skip the second factor, and no factor counts twice.
- Nobody hands out permissions they do not hold, neither through an API key nor through an invitation accepted later.
- A returning member, a discarded tenant and a deleted owner no longer leave the system in a state that only manual repair fixes.
- A Valkey outage delays a revocation instead of losing it.
- The answer to a password reset request and the row a failed sign-in writes no longer tell whether an email has an account.

### Costs

- The app must sign the sign-in with its device key; until the front sends the proof every sign-in from a new session asks for a second factor.
- `tenant_members` keeps one soft-deleted row per removed member and a departure column, and the two new queues add consumers to identity.
- The erasure of an account visits every shard to delete the tombstones of earlier removals.
- A reset email now goes out from the worker a moment after the request, and a redelivery may send a second token.
- `login_attempts` keeps the IP of attempts on emails without an account until the partition retention drops them.
- An invitation to a tenant whose only owner is deleting their account cannot be accepted until the deletion finishes or is cancelled, unless it grants the owners group.
- Every password reset request, also for an email without an account, writes the typed email in clear into the outbox of the default tenant shard and into the `identity-password-resets` queue. The outbox keeps the published row for 7 days (the default retention of the platform), the queue keeps an unread message for 4 days (the SQS default) and its dead letter queue for 14 days; both queues are encrypted with the messaging KMS key. That is personal data of people who may not be users, kept longer than the request needs.
- The sign-in that locks an existing account still writes a security alert for its owner, one outbox row that an unknown email does not write.
- A tenant whose only member deletes their account stays without members until a lifecycle job retires it.

### Pending

- The `EmailChanged` alert still goes to the new address: notifications resolves the recipient from the current email, and sending it to the old address needs a template and a recipient in notifications.
- `audit_log` is append-only and keeps the email and name of an erased user, and pending invitations keep the invited email; scrubbing them needs a platform decision on audited columns and a cross-shard sweep.
- Per-purpose subkeys for `IDENTITY_TOKEN_PEPPER` with a `kid`, the `@Global` modules with their cycles, the scattered authorization and the anemic access domain belong to the structural cycle.

## Alternatives considered

- A separate tombstone table for removed members: it needs its own migration, isolation and relocation entry, while the soft delete column already exists and TypeORM reads hide it.
- Retrying the write to Valkey after the commit: it covers a blip but not a crash or a long outage, which the outbox already covers.
- Refusing every account deletion of an owner: it would keep a person who is the only member of their tenant from erasing their data.
- Checking the last owner only when the erasure removes the membership: the second deletion would pass its check, reach its pivot and then fail with the account half erased.
- Sending the reset email in the request and padding the unknown case with the same work: the timing of notifications and its errors would still differ between the two cases.
- Carrying a keyed hash of the email instead of the email: the catalog finds accounts by normalized email, so the worker would need a new hashed index in the catalog and its migration; it stays open as a data minimization step if the retention above proves too long.
