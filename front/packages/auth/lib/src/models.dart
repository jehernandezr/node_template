/// Tokens devueltos por un login exitoso o un refresh.
final class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.accessExpiresAt,
    this.sessionToken,
  });

  /// JWT de corta vida (10 a 15 min), guardado solo en memoria.
  final String accessToken;

  /// Momento en que [accessToken] deja de ser válido.
  final DateTime accessExpiresAt;

  /// Session token opaco. Es null cuando vive en una cookie httpOnly (web).
  final String? sessionToken;
}

/// Métodos de segundo factor que el servidor puede ofrecer.
enum MfaMethod { deviceOtp, emailOtp, totp, recoveryCode, passkey }

/// Desafío MFA pendiente de verificar.
final class MfaChallenge {
  const MfaChallenge({required this.mfaToken, required this.methods});

  /// Token que liga el desafío con el login que lo pidió.
  final String mfaToken;

  /// Métodos disponibles para este usuario y dispositivo.
  final Set<MfaMethod> methods;
}

/// Resultado de un intento de login o de verificación MFA.
sealed class LoginResult {
  const LoginResult();
}

/// Login completo: hay tokens.
final class LoginSucceeded extends LoginResult {
  const LoginSucceeded(this.tokens);

  final AuthTokens tokens;
}

/// Falta un segundo factor antes de emitir tokens.
final class LoginRequiresMfa extends LoginResult {
  const LoginRequiresMfa(this.challenge);

  final MfaChallenge challenge;
}

/// Login rechazado. [code] es el código de error de la API.
final class LoginFailed extends LoginResult {
  const LoginFailed(this.code);

  final String code;
}

/// Error de autenticación con código de la API, p. ej. `IDENTITY.SESSION.REVOKED`.
final class AuthException implements Exception {
  const AuthException(this.code, [this.message]);

  final String code;
  final String? message;

  @override
  String toString() =>
      'AuthException($code${message == null ? '' : ': $message'})';
}
