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
  Future<AuthTokens> refresh();

  /// Revoca la sesión actual en el servidor.
  Future<void> logout();
}

/// Almacenamiento persistente de tokens. El adaptador real usa Keychain o Keystore.
abstract interface class TokenStore {
  Future<AuthTokens?> read();
  Future<void> write(AuthTokens tokens);
  Future<void> clear();
}

/// Clave de dispositivo que no sale del hardware (Secure Enclave, Keystore o WebCrypto no exportable).
abstract interface class DeviceKeyPort {
  /// Clave pública del dispositivo, para registrarlo.
  Future<List<int>> publicKey();

  /// Firma [data] con la clave privada del dispositivo.
  Future<List<int>> sign(List<int> data);
}
