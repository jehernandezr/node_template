# auth

Sesión del front contra el servicio `identity`. Usa los tipos y códigos
generados de `package:contracts` (`SignInRequest`, `SignInResponse`,
`PendingMfa`, `MfaFactor`, `MfaChallenge`, `MfaVerifyRequest`,
`SessionTokens`, `SessionTokenRequest`, `StepUpVerifyRequest`, `StepUpResult`,
`SessionAccess`, `IdentityErrorCode`, `MfaRules`); no define
modelos propios. Los adaptadores de almacenamiento seguro y de claves de
hardware (Keychain/Keystore, Secure Enclave, WebCrypto) se agregan después.

## API pública (`package:auth/auth.dart`)

- **Puertos**: `AuthRepository` (`signIn`, `requestMfaChallenge`, `verifyMfa`,
  `refresh`, `logout`, `startStepUp`, `requestStepUpChallenge`,
  `verifyStepUp`), `TokenStore` (`CookieTokenStore` en web),
  `DeviceKeyPort`.
- **Repositorio real**: `ApiAuthRepository` sobre `ApiClient`, que valida cada
  petición contra el contrato antes de llamar. El refresh
  (`POST /v1/auth/refresh`) y el cierre (`POST /v1/auth/sign-out`) son
  públicos y llevan el session token en el cuerpo; en web va vacío y viaja la
  cookie httpOnly. El paso adicional (`/v1/me/step-up`) va por un
  `sessionClient` con el access token.
- **Gestor**: `SessionManager` con `restore`, `signIn`, `requestMfaChallenge`,
  `verifyMfa`, `startStepUp`, `requestStepUpChallenge`, `verifyStepUp`,
  `accessToken`, `refresh`, `logout`, `handleRejectedToken`, `state` y
  `states` (`AuthState`: `signedOut`, `signedIn`, `refreshing`).
  - Refresca el access token `refreshLead` antes de que venza.
  - Un solo refresh en vuelo para las llamadas concurrentes.
  - Cierra la sesión en logout o cuando el servidor la invalida con un código
    de `invalidationCodes` (por defecto `defaultInvalidationCodes`: sesión
    revocada, vencida o reutilizada, token revocado, usuario o tenant
    suspendido), sea en el refresh o en cualquier ruta autenticada. Un
    refresh con `PLATFORM.AUTH.UNAUTHENTICATED` también la cierra.
  - `verifyStepUp` adopta el access token nuevo, con el segundo factor al día.
  - `accessToken` devuelve null sin sesión: es el `accessToken` de
    `ApiClient`.
- **Conexión**: `IdentityConnection` reúne el `SessionManager`, el `ApiClient`
  con la sesión y el acceso de `GET /v1/me/access` (`access`), que se recarga
  tras cada refresh y vuelve a null al cerrar la sesión. Ante un código de
  `refreshCodes` el cliente refresca y reintenta una vez. La conexión es
  dueña del transporte y lo cierra en `dispose`. Su transporte
  (`SessionInvalidationTransport`) avisa al gestor cuando una ruta
  autenticada rechaza el token con un código de invalidación, y
  `markMfaVerified` publica el `mfaVerifiedAt` de un paso adicional.
- **Flujos**: `SignInFlow` (credenciales, método y código del segundo
  factor) y `StepUpFlow` (paso adicional de una sesión abierta) son
  `ChangeNotifier` con el estado de cada paso y la regla de qué se reinicia
  ante cada error. Los formularios de `shell_host` solo los dibujan.
- **Almacén temporal**: `InMemoryTokenStore` guarda el session token en
  memoria hasta que exista el adaptador de Keychain/Keystore.
- **Errores**: los del servidor son `ApiErrorException` con el código del
  contrato; `SignedOutException` indica que no hay sesión o que un logout
  anuló la operación. Un fallo de red llega como `TransportException`.
- **Dobles de prueba**: `package:auth/testing.dart` (`FakeAuthRepository`,
  `FakeTokenStore`, `FakeDeviceKeyPort`). El código de producción no los
  importa.

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
