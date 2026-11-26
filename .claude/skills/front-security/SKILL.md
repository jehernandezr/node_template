---
name: front-security
description: 'Front security: secrets, tokens, HTTPS, validation, logs and deep links. Use it when touching the session, ApiClient or storage.'
paths:
  - 'front/packages/auth/**'
  - 'front/packages/api/**'
  - 'front/apps/**'
---

# Front security

Everything that reaches a client can be recovered by whoever holds it. The UI hides what the user cannot use, but the API is the authority (ADR 0012 and 0018). This skill covers what can be seen by reading the code.

## Rules

- **Secrets:** no private API key, service token or password in the code, in an asset, in a `.env` or in `--dart-define`. All of that ends up in the binary or the bundle and gets extracted. The only thing passed through `--dart-define` is public configuration (`API_BASE_URL`). If the client needs a secret, the server serves it through an authenticated operation. <!-- id: front-security.1 -->
- **Tokens:** the web session token is an `httpOnly` cookie (`CookieTokenStore`) that the client does not read. On mobile the real adapter uses Keychain and Keystore behind the `TokenStore` port; today it lives in memory, and it is documented that way. Never `SharedPreferences`, files or `localStorage` for tokens, session or personal data. <!-- id: front-security.2 -->
- **Network:** HTTPS only. Never a `badCertificateCallback` that returns `true` or an HTTP client with validation turned off. Everything goes through `ApiClient`; in live mode, `IdentityConnection` owns the transport (it cuts each request at 30 s) and refreshes with `SessionRefreshPolicy`. Anyone who needs another client justifies it in the PR. <!-- id: front-security.3 -->
- **Authorization:** `AccessRule`, `AccessGate` and `context.can` are UI conveniences. The server answers 401 or 403 and the client handles it (it logs out on the codes in `IdentityConnection.refreshCodes`). <!-- id: front-security.4 -->
- **Input:** anything coming from a deep link, from `params` or from the clipboard is validated before use, with the validators generated in `contracts`. Never build a URL or a query by concatenating unencoded text: `Uri(...)` with `pathSegments` and `queryParameters`. <!-- id: front-security.5 -->
- **Data across identities:** nothing from one user survives an identity change (`ScopedResource` repositories, `identityEpoch`). A cache in a top-level variable is a security bug. <!-- id: front-security.6 -->
- **Logs:** no `print` or `debugPrint` of tokens, emails, or request or response bodies. Errors are shown by code (`showActionError`), not with the raw exception text. <!-- id: front-security.7 -->
- **Randomness:** `Random.secure()` for any identifier, nonce or challenge. `Random()` only for visual effects. <!-- id: front-security.8 -->
- **Cryptography:** never homemade. Hashing with `package:crypto` only when it is really needed on the client; passwords are not hashed on the client. <!-- id: front-security.9 -->
- **Dependencies:** every new package with an exact version, maintained and with a compatible license. Before a release, `pubspec.lock` is checked with `osv-scanner`, and no warning is silenced without a written justification. <!-- id: front-security.10 -->
- **Biometrics or second factor:** only with the official plugin (`local_auth`) behind a port, not with a custom `MethodChannel`. <!-- id: front-security.11 -->
- **Platform:** `android:allowBackup="false"` in the mobile app manifest, and no permissions the feature does not use. <!-- id: front-security.12 -->

## Example

```dart
Uri taskUri(String id, {TaskStatus? status}) => Uri(
  pathSegments: ['v1', 'tasks', id],
  queryParameters: {if (status != null) 'status': status.wire},
);
```

## Review report

Each finding is Critical (secret in the binary, TLS validation off, token in plaintext storage, sensitive data in logs), Warning (no input validation, `Random()` for an identifier, backup enabled) or Note (outdated dependency, missing obfuscation). Each one comes with the file, the rule and the corrected code.

## With pstack

Method in `pstack-in-node-template`. The pstack skills that apply here: `interrogate`, `blast-radius`, `principle-boundary-discipline`.
