# 0030. Identity email through notifications

- Status: Accepted
- Date: 2026-11-23
- Related: [ADR 0008](0008-orchestrated-sagas-persistent-log.md), [ADR 0020](0020-terraform-stacks-and-runtime-per-service.md)

## Context

Identity sends nine transactional email templates through an in-memory or console adapter. Notifications already exposes `notifications.messages.send.v1`, but its contract had five templates and expects data named by `TemplateParameter`, while identity hands over its own tokens and variables. Two identity templates (account unlock and security alert) had nobody to send them: unlocking happens by time and the alert already goes out as an event, which notifications turns into a notice on every channel. The web does not yet have the screens a verification, recovery or invitation link would point to.

## Decision

- `NotificationsIdentityMailer` (`IDENTITY_MAILER=notifications`) calls `notifications.messages.send.v1` through the internal API, with a new `messageId` per email. A code never goes through the bus.
- The notifications contract adds `EmailTemplate.EmailAlreadyRegistered`, `EmailTemplate.MfaRecovery` and `TemplateParameter.AvailableAt`. The unused identity templates (`AccountUnlock` and `SecurityAlert`) are removed.
- The identity token travels as `TemplateParameter.Code`. Once the web has its screens, identity will add `TemplateParameter.Link` and the template will show the action.
- Each template declares which data are optional. A line with an optional value that did not arrive is left out, so a greeting without a name does not leave the key in sight. If a mandatory value is missing, such as the MFA code, rendering fails with `NOTIFICATIONS.EMAIL.TEMPLATE_PARAMETER_MISSING` and the email does not go out.
- Before the email is handed to the provider, the `messageId` is reserved in `email_messages` in the `sending` state with an `INSERT ... ON CONFLICT`. A second send with the same id while the first is still in progress answers `NOTIFICATIONS.EMAIL.IN_PROGRESS`, which is retryable. A later one returns the send already made. If the provider fails, the reservation is left `failed` and can be retried. A reservation that has been in `sending` for more than two minutes, measured with the clock of the database that writes `updated_at`, belongs to a process that crashed and is taken over. If the ledger fails after the send, the send is not marked `failed` and recording `sent` is tried three times. Between tries `SendEmail` waits on the `LedgerRetryWait` port; `BackoffLedgerRetryWait` waits an exponential delay with equal jitter, between a quarter and half a second before the second try and between half a second and one second before the third, so a ledger outage of about a second does not use up every try, and the request stays well within its deadline. If all three fail, the row stays in `sending` and a retry with the same id after the two minutes sends again: the provider cannot be asked about a send by `messageId`, so with the ledger down delivery is at least once. A repeated code is preferred over one that never arrives.
- Identity sends the user's language (`locale`) when it knows it; an invitation goes to someone without an account and goes out in the notifications default language.
- A suppressed recipient (`NOTIFICATIONS.EMAIL.RECIPIENT_SUPPRESSED`) is a discarded email, not a failure: identity logs it and answers the same as for a send, because an error would reveal which addresses bounced or complained. Only a failure or an uncertain answer from notifications is `NotificationsUnavailableError`.
- The email ledger (`email_messages`) lives in the catalog and is global by `messageId`, although the design placed it in the tenant's shard: an identity email (sign-up, recovery, MFA code) may have no tenant, and idempotency by `messageId` has to hold without knowing which shard to look in. Like `notification_deliveries`, it has `version`, `created_at` and `updated_at`, but not `created_by` or `updated_by`: the service itself always writes it and those columns would hold a fixed value.
- `SignedInternalHttp` receives the services it calls, and the service does not start if `INTERNAL_API_BASE_URLS` lacks the URL of any of them. Every service's internal API answers on the same path, so that URL comes from the deployment and not from the shared ALB.

## Consequences

Positive:

- A real environment sends identity emails with the ledger, suppression and provider of notifications.
- Missing configuration shows up at startup and not on the first call.

Costs:

- Until the web has its screens, the user copies a long code instead of following a link.
- Identity depends on notifications answering to complete sign-up, recovery and invitations.
- A send whose ledger write keeps failing answers up to about a second and a half later.

## Alternatives considered

- Sending identity emails through the bus: the code would stay in the outbox and in the queues.
- Reusing existing templates for the cases without a template: the text would not match what happened.
- Retrying the ledger write without waiting: a short outage would use up every try at once.
