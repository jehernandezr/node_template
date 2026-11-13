// ignore_for_file: prefer_initializing_formals

import 'dart:async';

import 'package:contracts/contracts.dart';

import 'ports.dart';

/// Repositorio en memoria. Cada prueba configura los resultados y lee las
/// peticiones recibidas.
class FakeAuthRepository implements AuthRepository {
  /// Resultado de [signIn]. Si no hay, lanza `IDENTITY.AUTH.INVALID_CREDENTIALS`.
  SignInResponse? signInResult;

  /// Resultado de [requestMfaChallenge]. Si no hay, lanza
  /// `IDENTITY.MFA.TOKEN_INVALID`.
  MfaChallenge? challengeResult;

  /// Resultado de [verifyMfa]. Si no hay, lanza `IDENTITY.MFA.CODE_INVALID`.
  SignInResponse? verifyResult;

  /// Tokens que devuelve [refresh].
  SessionTokens? refreshResult;

  /// Si no es null, [refresh] lanza este error.
  Object? refreshError;

  /// Si no es null, [refresh] espera a que se complete antes de responder.
  Completer<void>? refreshGate;

  int signInCount = 0;
  int refreshCount = 0;
  int logoutCount = 0;

  /// Session token recibido en el último [refresh].
  String? lastRefreshSessionToken;
  SignInRequest? lastSignIn;
  MfaChallengeRequest? lastChallengeRequest;
  MfaVerifyRequest? lastVerify;

  @override
  Future<SignInResponse> signIn(SignInRequest request) async {
    signInCount++;
    lastSignIn = request;
    return signInResult ??
        (throw apiError(IdentityErrorCode.authInvalidCredentials));
  }

  @override
  Future<MfaChallenge> requestMfaChallenge(MfaChallengeRequest request) async {
    lastChallengeRequest = request;
    return challengeResult ??
        (throw apiError(IdentityErrorCode.mfaTokenInvalid));
  }

  @override
  Future<SignInResponse> verifyMfa(MfaVerifyRequest request) async {
    lastVerify = request;
    return verifyResult ?? (throw apiError(IdentityErrorCode.mfaCodeInvalid));
  }

  @override
  Future<SessionTokens> refresh({String? sessionToken}) async {
    refreshCount++;
    lastRefreshSessionToken = sessionToken;
    final gate = refreshGate;
    if (gate != null) await gate.future;
    final error = refreshError;
    if (error != null) throw error;
    final tokens = refreshResult;
    if (tokens == null) {
      throw StateError('FakeAuthRepository.refreshResult no configurado');
    }
    return tokens;
  }

  @override
  Future<void> logout() async {
    logoutCount++;
  }

  /// Error de la API con [code], como lo lanzaría `ApiClient`.
  static ApiErrorException apiError(IdentityErrorCode code) =>
      ApiErrorException(
        ProblemDetails(
          type: 'about:blank',
          title: code.code,
          status: code.httpStatus,
          code: code.code,
        ),
      );
}

/// Almacén del session token en memoria.
class InMemoryTokenStore implements TokenStore {
  InMemoryTokenStore([String? initial, this.sessionInCookie = false])
    : _sessionToken = initial;

  String? _sessionToken;

  @override
  final bool sessionInCookie;

  /// Si no es null, [writeSessionToken] espera a que se complete antes de
  /// guardar. Sirve para probar lo que pasa mientras la escritura está pendiente.
  Completer<void>? writeGate;

  int writeCount = 0;

  /// Session token guardado, sin pasar por la interfaz asíncrona.
  String? get sessionToken => _sessionToken;

  @override
  Future<String?> readSessionToken() async => _sessionToken;

  @override
  Future<void> writeSessionToken(String sessionToken) async {
    writeCount++;
    final gate = writeGate;
    if (gate != null) await gate.future;
    _sessionToken = sessionToken;
  }

  @override
  Future<void> clear() async {
    _sessionToken = null;
  }
}

/// Clave de dispositivo falsa. [sign] invierte los bytes para que sea determinista.
class FakeDeviceKeyPort implements DeviceKeyPort {
  FakeDeviceKeyPort({List<int> publicKey = const [1, 2, 3, 4]})
    : _publicKey = publicKey;

  final List<int> _publicKey;
  int signCount = 0;

  @override
  Future<List<int>> publicKey() async => _publicKey;

  @override
  Future<List<int>> sign(List<int> data) async {
    signCount++;
    return data.map((byte) => byte ^ 0xFF).toList();
  }
}
