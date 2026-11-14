import 'package:contracts/contracts.dart';

/// Operaciones de identity que usa la sesión, con los tipos del contrato.
///
/// El login desde un dispositivo nuevo tiene tres pasos: [signIn] responde
/// tokens o un desafío pendiente (`PendingMfa`); [requestMfaChallenge] crea el
/// desafío para el método elegido y envía el código; [verifyMfa] lo verifica
/// con su `challengeId` y entrega los tokens.
///
/// Los errores del servidor se lanzan como [ApiErrorException] y una petición
/// que no cumple el contrato como [ContractViolationException].
abstract interface class AuthRepository {
  /// `POST /v1/auth/sign-in`.
  Future<SignInResponse> signIn(SignInRequest request);

  /// `POST /v1/auth/mfa/challenges`.
  Future<MfaChallenge> requestMfaChallenge(MfaChallengeRequest request);

  /// `POST /v1/auth/mfa/verify`.
  Future<SignInResponse> verifyMfa(MfaVerifyRequest request);

  /// `POST /v1/auth/refresh`: rota el session token y devuelve un access
  /// token nuevo.
  ///
  /// [sessionToken] es el guardado en el [TokenStore]; es null en web, donde
  /// el navegador envía la cookie httpOnly.
  Future<SessionTokens> refresh({String? sessionToken});

  /// `POST /v1/auth/sign-out`: revoca en el servidor la sesión de
  /// [sessionToken] (en web, la de la cookie).
  Future<void> logout({String? sessionToken});

  /// `POST /v1/me/step-up`: abre el paso adicional de la sesión actual y
  /// devuelve los métodos que ofrece. Exige sesión.
  Future<PendingMfa> startStepUp();

  /// `POST /v1/me/step-up/challenges`: crea el desafío del paso adicional.
  Future<MfaChallenge> requestStepUpChallenge(MfaChallengeRequest request);

  /// `POST /v1/me/step-up/verify`: verifica el paso adicional y devuelve el
  /// access token nuevo y el nuevo `mfaVerifiedAt` de la sesión.
  Future<StepUpResult> verifyStepUp(StepUpVerifyRequest request);
}

/// Almacenamiento persistente del session token.
///
/// El access token nunca se persiste: vive solo en la memoria de
/// `SessionManager` y, al arrancar, se obtiene con un refresh. En móvil el
/// adaptador real usa Keychain o Keystore. En web el session token vive en una
/// cookie httpOnly que el cliente no puede leer: se usa [CookieTokenStore].
abstract interface class TokenStore {
  /// Si el session token viaja en una cookie httpOnly que este almacén no ve.
  ///
  /// Con true, `SessionManager.restore` intenta el refresh aunque
  /// [readSessionToken] devuelva null.
  bool get sessionInCookie;

  Future<String?> readSessionToken();
  Future<void> writeSessionToken(String sessionToken);
  Future<void> clear();
}

/// [TokenStore] de web: el session token es una cookie httpOnly que gestiona
/// el navegador, así que no hay nada que leer ni escribir.
final class CookieTokenStore implements TokenStore {
  const CookieTokenStore();

  @override
  bool get sessionInCookie => true;

  @override
  Future<String?> readSessionToken() async => null;

  @override
  Future<void> writeSessionToken(String sessionToken) async {}

  @override
  Future<void> clear() async {}
}

/// Clave de dispositivo que no sale del hardware (Secure Enclave, Keystore o WebCrypto no exportable).
abstract interface class DeviceKeyPort {
  /// Clave pública del dispositivo, para registrarlo.
  Future<List<int>> publicKey();

  /// Firma [data] con la clave privada del dispositivo.
  Future<List<int>> sign(List<int> data);
}
