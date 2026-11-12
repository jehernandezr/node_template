// ignore_for_file: prefer_initializing_formals

import 'dart:async';

import 'models.dart';
import 'ports.dart';

/// Repositorio en memoria. Cada prueba configura los resultados y lee los contadores.
class FakeAuthRepository implements AuthRepository {
  /// Resultado de [login].
  LoginResult loginResult = const LoginFailed('IDENTITY.AUTH.INVALID_CREDENTIALS');

  /// Resultado de [verifyMfa].
  LoginResult mfaResult = const LoginFailed('IDENTITY.MFA.INVALID_CODE');

  /// Tokens que devuelve [refresh].
  AuthTokens? refreshResult;

  /// Si no es null, [refresh] lanza este error.
  Object? refreshError;

  /// Si no es null, [refresh] espera a que se complete antes de responder.
  Completer<void>? refreshGate;

  int loginCount = 0;
  int refreshCount = 0;
  int logoutCount = 0;
  String? lastLoginDeviceId;
  MfaMethod? lastMfaMethod;
  String? lastMfaCode;
  List<int>? lastDevicePublicKey;

  @override
  Future<LoginResult> login(
    String email,
    String password, {
    String? deviceId,
  }) async {
    loginCount++;
    lastLoginDeviceId = deviceId;
    return loginResult;
  }

  @override
  Future<LoginResult> verifyMfa(
    String mfaToken,
    MfaMethod method,
    String code, {
    List<int>? devicePublicKey,
  }) async {
    lastMfaMethod = method;
    lastMfaCode = code;
    lastDevicePublicKey = devicePublicKey;
    return mfaResult;
  }

  @override
  Future<AuthTokens> refresh() async {
    refreshCount++;
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
}

/// Almacén de tokens en memoria.
class InMemoryTokenStore implements TokenStore {
  InMemoryTokenStore([AuthTokens? initial]) : _tokens = initial;

  AuthTokens? _tokens;

  @override
  Future<AuthTokens?> read() async => _tokens;

  @override
  Future<void> write(AuthTokens tokens) async {
    _tokens = tokens;
  }

  @override
  Future<void> clear() async {
    _tokens = null;
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
