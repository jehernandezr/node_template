# 0006. MFA with a registered device and passkeys

- Status: Accepted
- Date: 2026-11-11
- Revised: 2026-11-14 (F4 design, section 11: the verifier app obtains the code from the registered device with a signed request and sends it on its own; WebAuthn options and responses travel as base64url inside the contract JSON)
- Revised: 2026-11-25 (a sign-in recognizes a device only by its signature; a factor never counts twice; a per-user cap on wrong codes; recoveries expire and are cancelled; see ADR 0036)

## Context

A stolen password must not be enough to sign in from a new device. At the same time, a user with their device at hand should not have to type a code on every login.

## Decision

MFA is mandatory when registering any new device, for all users. On every login, MFA only for tenant and backoffice administrators.

- Registration: the app generates a key pair in Secure Enclave, Android Keystore or WebCrypto (non-exportable) and sends the public key.
- Login from a registered device: the server sends a challenge, the app signs it and generates the 8-digit code without user intervention. It expires in 2 to 3 minutes.
- A sign-in recognizes the device only from its proof: an ES256 signature, with the device key, over the route, the public device id, a timestamp within one minute, a single-use nonce and the email (password sign-in) or the WebAuthn challenge id (passkey sign-in). The public id `dv1_<user>_<home tenant>_<device>` only routes to the shard; anyone who knows the claims of an old token can build it, so it proves nothing on its own. Without a valid proof the device is unknown and the sign-in asks for a second factor.
- First device: 6-digit code by email, expiring in 5 minutes.
- Each code is stored as an HMAC, is single use, allows 5 attempts per challenge and 3 challenges every 15 minutes.
- Passkeys from the first version (WebAuthn with `@simplewebauthn/server`). In backoffice they are the recommended method.
- One factor never counts twice. A passkey with user verification, from a device that proves it holds its key, satisfies both factors; any other passkey sign-in asks for a second factor and does not offer a passkey for it. A passkey used as a second factor or for step-up must verify the user (PIN or biometrics), and a passkey step-up only completes for the session that started it.
- Wrong codes count per user across every challenge: ten in fifteen minutes stop the verification until the window slides, so a stolen session cannot guess a TOTP code by opening challenge after challenge. Step-up routes are in the sensitive rate limit tier.
- Recovery without a device by email, with an exponential wait of 24 h, 48 h and 96 h, capped there. A recovery not confirmed within three days after it becomes available expires, and proving any second factor meanwhile cancels the pending ones.
- Sensitive operations use step-up: `mfa: { maxAgeMinutes: 10 }`.

## Consequences

Positive:

- A user with a registered device signs in without typing codes.
- A passkey with user verification on a registered device that proves it holds its key satisfies both factors.
- The increasing wait during recovery slows down account takeover through email.

Costs:

- If the user loses the registered device, recovery takes at least 24 hours.
- The app must handle device keys on iOS, Android and web.

## Alternatives considered

- Email code as a login method: the document retires it when there is a registered device.
- TOTP and recovery codes: they remain as a fallback, not as the main method.
