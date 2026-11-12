# auth

Puertos, modelos y gestor de sesión para la autenticación del front. Los
adaptadores reales (HTTP, Keychain/Keystore, Secure Enclave, WebCrypto) se
agregan después; este paquete solo define contratos y fakes para pruebas.

## API pública (`package:auth/auth.dart`)

- **Modelos**: `AuthTokens`, `MfaChallenge`, `MfaMethod`, `LoginResult`
  (`LoginSucceeded`, `LoginRequiresMfa`, `LoginFailed`), `AuthException`.
- **Puertos**: `AuthRepository`, `TokenStore`, `DeviceKeyPort`.
- **Gestor**: `SessionManager` con `restore`, `login`, `verifyMfa`,
  `accessToken`, `logout`, `state` y `states` (`AuthState`: `signedOut`,
  `signedIn`, `refreshing`).
  - Refresca el access token `refreshLead` antes de que venza.
  - Un solo refresh en vuelo para las llamadas concurrentes.
  - Limpia todo en logout o cuando el refresh devuelve un código de
    invalidación (`defaultInvalidationCodes`, configurable).
- **Fakes**: `FakeAuthRepository`, `InMemoryTokenStore`, `FakeDeviceKeyPort`.

## Uso

```dart
final manager = SessionManager(
  repository: repository,
  tokenStore: tokenStore,
  deviceKeys: deviceKeys,
);

await manager.restore();
final result = await manager.login(email, password, deviceId: deviceId);
if (result is LoginRequiresMfa) {
  await manager.verifyMfa(
    result.challenge.mfaToken,
    MfaMethod.deviceOtp,
    code,
    registerDevice: true,
  );
}
final token = await manager.accessToken();
```

## Pruebas

```sh
flutter analyze && flutter test
```
