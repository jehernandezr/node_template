import 'models.dart';

/// Operaciones de identidad contra el backend de `identity`.
abstract interface class AuthRepository {
  /// Email y contraseña. [deviceId] es el id firmado que el cliente guardó
  /// en su primer login.
  Future<LoginResult> login(String email, String password, {String? deviceId});

  /// Verifica un desafío MFA. [devicePublicKey] se envía solo al registrar
  /// un dispositivo nuevo.
  Future<LoginResult> verifyMfa(
    String mfaToken,
    MfaMethod method,
    String code, {
    List<int>? devicePublicKey,
  });

  /// Rota el session token y devuelve un access token nuevo.
  ///
  /// [sessionToken] es el guardado en el [TokenStore]; es null en web, donde
  /// el navegador envía la cookie httpOnly.
  Future<AuthTokens> refresh({String? sessionToken});

  /// Revoca la sesión actual en el servidor.
  Future<void> logout();
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
