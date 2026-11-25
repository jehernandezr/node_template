# auth

Front session against the `identity` service. It uses the types and codes
generated in `package:contracts` (`SignInRequest`, `SignInResponse`,
`PendingMfa`, `MfaFactor`, `MfaChallenge`, `MfaVerifyRequest`,
`SessionTokens`, `SessionTokenRequest`, `StepUpVerifyRequest`, `StepUpResult`,
`SessionAccess`, `IdentityErrorCode`, `MfaRules`); it defines no
models of its own. The secure storage and hardware key adapters
(Keychain/Keystore, Secure Enclave, WebCrypto) are added later.

## Public API (`package:auth/auth.dart`)

- **Ports**: `AuthRepository` (`signIn`, `requestMfaChallenge`, `verifyMfa`,
  `refresh`, `logout`, `startStepUp`, `requestStepUpChallenge`,
  `verifyStepUp`), `TokenStore` (`CookieTokenStore` on web),
  `DeviceKeyPort`.
- **Real repository**: `ApiAuthRepository` on top of `ApiClient`, which validates each
  request against the contract before calling. Refresh
  (`POST /v1/auth/refresh`) and sign-out (`POST /v1/auth/sign-out`) are
  public and carry the session token in the body; on web the body is empty and the
  httpOnly cookie travels instead. The additional step (`/v1/me/step-up`) goes through a
  `sessionClient` with the access token.
- **Manager**: `SessionManager` with `restore`, `signIn`, `requestMfaChallenge`,
  `verifyMfa`, `startStepUp`, `requestStepUpChallenge`, `verifyStepUp`,
  `accessToken`, `refresh`, `logout`, `handleRejectedToken`, `state` and
  `states` (`AuthState`: `signedOut`, `signedIn`, `refreshing`).
  - Refreshes the access token `refreshLead` before it expires.
  - A single refresh in flight for concurrent calls.
  - Closes the session on logout or when the server invalidates it with a code
    from `invalidationCodes` (by default `defaultInvalidationCodes`: session
    revoked, expired or reused, token revoked, user or tenant
    suspended), whether in the refresh or in any authenticated route. A
    refresh with `PLATFORM.AUTH.UNAUTHENTICATED` also closes it.
  - `verifyStepUp` adopts the new access token, with an up-to-date second factor.
  - `accessToken` returns null without a session: it is the `accessToken` of
    `ApiClient`.
- **Connection**: `IdentityConnection` brings together the `SessionManager`, the `ApiClient`
  with the session and the access from `GET /v1/me/access` (`access`), which is reloaded
  after every refresh and goes back to null when the session closes. On a code from
  `refreshCodes` the client refreshes and retries once. The connection
  owns the transport and closes it in `dispose`. Its transport
  (`SessionInvalidationTransport`) notifies the manager when an authenticated
  route rejects the token with an invalidation code, and
  `markMfaVerified` publishes the `mfaVerifiedAt` of an additional step.
- **Flows**: `SignInFlow` (credentials, method and second factor
  code) and `StepUpFlow` (additional step of an open session) are
  `ChangeNotifier`s with the state of each step and the rule of what resets
  on each error. The `shell_host` forms only draw them.
- **Temporary store**: `InMemoryTokenStore` keeps the session token in
  memory until the Keychain/Keystore adapter exists.
- **Errors**: server errors are `ApiErrorException` with the contract
  code; `SignedOutException` means there is no session or that a logout
  cancelled the operation. A network failure arrives as `TransportException`.
- **Test doubles**: `FakeAuthRepository`, `FakeTokenStore` and
  `FakeDeviceKeyPort` live in the `test_utils` package, which is only used in
  `dev_dependencies`.

## Usage

```dart
final connection = IdentityConnection(
  transport: PackageHttpTransport(),
  baseUri: Uri.parse(apiBaseUrl),
  tokenStore: tokenStore,
  deviceKeys: deviceKeys,
);
final manager = connection.sessionManager;

final response = await manager.signIn(
  SignInRequest(email: email, password: password, deviceId: deviceId),
);
final pending = response.mfa;
if (pending != null) {
  final challenge = await manager.requestMfaChallenge(
    mfaToken: pending.mfaToken,
    method: pending.methods.first,
  );
  await manager.verifyMfa(
    mfaToken: pending.mfaToken,
    challengeId: challenge.challengeId,
    code: code,
    registerDevice: true,
  );
}
await connection.reloadAccess();
```

## Tests

```sh
flutter analyze && flutter test
```
