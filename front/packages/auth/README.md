# auth

Sesión del front contra el servicio `identity`. Usa los tipos y códigos
generados de `package:contracts` (`SignInRequest`, `SignInResponse`,
`PendingMfa`, `MfaFactor`, `MfaChallenge`, `MfaVerifyRequest`,
`SessionTokens`, `SessionAccess`, `IdentityErrorCode`, `MfaRules`); no define
modelos propios. Los adaptadores de almacenamiento seguro y de claves de
hardware (Keychain/Keystore, Secure Enclave, WebCrypto) se agregan después.

## API pública (`package:auth/auth.dart`)

- **Puertos**: `AuthRepository` (`signIn`, `requestMfaChallenge`, `verifyMfa`,
  `refresh`, `logout`), `TokenStore` (`CookieTokenStore` en web),
  `DeviceKeyPort`.
- **Repositorio real**: `ApiAuthRepository` sobre `ApiClient`, que valida cada
  petición contra el contrato antes de llamar. El contrato aún no publica
  refresh ni cierre de sesión: sin ellos, `refresh` responde
  `PLATFORM.AUTH.UNAUTHENTICATED` sin red y `logout` solo cierra la sesión
  local.
- **Gestor**: `SessionManager` con `restore`, `signIn`, `requestMfaChallenge`,
  `verifyMfa`, `accessToken`, `refresh`, `logout`, `state` y `states`
  (`AuthState`: `signedOut`, `signedIn`, `refreshing`).
  - Refresca el access token `refreshLead` antes de que venza.
  - Un solo refresh en vuelo para las llamadas concurrentes.
  - Cierra la sesión en logout o cuando el refresh devuelve un código de
    `invalidationCodes` (`Set<IdentityErrorCode>`, por defecto
    `{IdentityErrorCode.sessionRevoked}`) o `PLATFORM.AUTH.UNAUTHENTICATED`.
  - `accessToken` devuelve null sin sesión: es el `accessToken` de
    `ApiClient`.
- **Conexión**: `IdentityConnection` reúne el `SessionManager`, el `ApiClient`
  con la sesión y el acceso de `GET /v1/me/access` (`access`), que se recarga
  tras cada refresh y vuelve a null al cerrar la sesión.
- **Errores**: los del servidor son `ApiErrorException` con el código del
  contrato; `SignedOutException` indica que no hay sesión o que un logout
  anuló la operación.
- **Fakes**: `FakeAuthRepository`, `InMemoryTokenStore`, `FakeDeviceKeyPort`.

## Uso

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

## Pruebas

```sh
flutter analyze && flutter test
```
