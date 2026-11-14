import 'package:contracts/contracts.dart';
import 'package:flutter/foundation.dart';

import '../identity_connection.dart';
import '../session_manager.dart';
import 'mfa_methods.dart';

/// Estado común del login y del paso adicional: un desafío MFA pendiente, el
/// desafío del método elegido, si hay una llamada en curso y el código del
/// último error.
///
/// Los formularios solo dibujan este estado y llaman a sus acciones; las
/// reglas de qué paso se reinicia ante cada error viven aquí, así se prueban
/// sin montar widgets.
abstract base class MfaFlow extends ChangeNotifier {
  MfaFlow({this._busy = false});

  PendingMfa? _pending;
  MfaChallenge? _challenge;
  String? _errorCode;
  bool _busy;
  bool _disposed = false;

  /// Desafío pendiente con sus métodos, o null antes de que el servidor lo
  /// pida (o después de que lo diera por muerto).
  PendingMfa? get pending => _pending;

  /// Desafío del método elegido, o null mientras no hay uno vigente.
  MfaChallenge? get challenge => _challenge;

  /// Código público del último error, para `errorMessage`, o null.
  String? get errorCode => _errorCode;

  /// Si hay una llamada en curso.
  bool get busy => _busy;

  /// Métodos del desafío pendiente que este flujo sabe completar, en el orden
  /// del servidor.
  List<MfaFactor> get methods => [
    for (final method in _pending?.methods ?? const <MfaFactor>[])
      if (codeMfaMethods.contains(method)) method,
  ];

  /// Errores que obligan a pedir un desafío nuevo con el mismo `mfaToken`.
  Set<IdentityErrorCode> get _challengeResetCodes;

  /// Corre [step] marcando el flujo ocupado y traduce sus fallos a
  /// [errorCode]. Devuelve el resultado, o null si falló.
  ///
  /// Solo atrapa excepciones: un error de programación (`TypeError`,
  /// `StateError`) sale tal cual, después de soltar [busy].
  Future<T?> _run<T>(Future<T> Function() step) async {
    _busy = true;
    _errorCode = null;
    _notify();
    try {
      return await step();
    } on ApiErrorException catch (error) {
      _onProblem(error.problem.code);
    } on ContractViolationException {
      _errorCode = PlatformErrorCode.validationInvalidInput.code;
    } on Exception {
      // Red, tiempo agotado o sesión cerrada: un mensaje genérico, nunca el
      // texto de la excepción.
      _errorCode = PlatformErrorCode.internalUnexpected.code;
    } finally {
      _busy = false;
      _notify();
    }
    return null;
  }

  void _onProblem(String code) {
    _errorCode = code;
    final identity = IdentityErrorCode.fromCode(code);
    if (identity == IdentityErrorCode.mfaTokenInvalid) {
      _pending = null;
      _challenge = null;
    } else if (_challengeResetCodes.contains(identity)) {
      _challenge = null;
    }
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

/// Login real contra identity.
///
/// Primero email y contraseña ([signIn]). Si identity pide un segundo factor,
/// el usuario elige un método ([requestChallenge]) y verifica el código
/// ([verify]). Cuando la sesión queda abierta carga su acceso, y la acción
/// devuelve true.
final class SignInFlow extends MfaFlow {
  SignInFlow(this._connection);

  final IdentityConnection _connection;

  SessionManager get _manager => _connection.sessionManager;

  @override
  Set<IdentityErrorCode> get _challengeResetCodes => const {
    IdentityErrorCode.mfaCodeExpired,
    IdentityErrorCode.mfaTooManyAttempts,
  };

  /// Envía las credenciales. Devuelve true si la sesión quedó abierta y false
  /// si falló o si falta el segundo factor ([pending] deja de ser null).
  Future<bool> signIn({
    required String email,
    required String password,
  }) async =>
      await _run(() async {
        final response = await _manager.signIn(
          SignInRequest(email: email, password: password),
        );
        final pending = response.mfa;
        if (pending != null) {
          _pending = pending;
          return false;
        }
        await _connection.reloadAccess();
        return true;
      }) ??
      false;

  /// Pide el desafío de [method] para el segundo factor pendiente.
  Future<void> requestChallenge(MfaFactor method) async {
    final pending = _pending;
    if (pending == null) throw StateError('No hay un segundo factor pendiente');
    await _run(() async {
      _challenge = await _manager.requestMfaChallenge(
        mfaToken: pending.mfaToken,
        method: method,
      );
    });
  }

  /// Verifica [code] para el desafío vigente y registra el dispositivo si hay
  /// clave de dispositivo. Devuelve true si la sesión quedó abierta.
  Future<bool> verify(String code) async {
    final pending = _pending;
    final challenge = _challenge;
    if (pending == null || challenge == null) {
      throw StateError('No hay un desafío vigente');
    }
    return await _run(() async {
          await _manager.verifyMfa(
            mfaToken: pending.mfaToken,
            challengeId: challenge.challengeId,
            code: code,
            registerDevice: _manager.canRegisterDevice,
          );
          await _connection.reloadAccess();
          return true;
        }) ??
        false;
  }
}

/// Paso adicional de una sesión abierta contra identity.
///
/// [start] abre el paso adicional y trae los métodos ofrecidos; el usuario
/// elige uno ([requestChallenge]) y verifica el código ([verify]). La sesión
/// adopta el access token nuevo, que lleva el segundo factor reciente.
///
/// Nace ocupado: quien lo crea llama a [start] enseguida.
final class StepUpFlow extends MfaFlow {
  StepUpFlow(this._manager) : super(busy: true);

  final SessionManager _manager;

  @override
  Set<IdentityErrorCode> get _challengeResetCodes => const {
    IdentityErrorCode.mfaCodeExpired,
    IdentityErrorCode.mfaTooManyAttempts,
    IdentityErrorCode.mfaMethodUnavailable,
  };

  /// Abre el paso adicional. Se puede repetir si falló.
  Future<void> start() => _run(() async {
    _pending = await _manager.startStepUp();
  });

  /// Pide el desafío de [method] para el paso adicional abierto.
  Future<void> requestChallenge(MfaFactor method) async {
    final pending = _pending;
    if (pending == null) throw StateError('El paso adicional no está abierto');
    await _run(() async {
      _challenge = await _manager.requestStepUpChallenge(
        mfaToken: pending.mfaToken,
        method: method,
      );
    });
  }

  /// Verifica [code] y devuelve el nuevo `mfaVerifiedAt`, o null si falló.
  Future<DateTime?> verify(String code) async {
    final pending = _pending;
    final challenge = _challenge;
    if (pending == null || challenge == null) {
      throw StateError('No hay un desafío vigente');
    }
    return _run(() async {
      final result = await _manager.verifyStepUp(
        mfaToken: pending.mfaToken,
        challengeId: challenge.challengeId,
        code: code,
      );
      return result.mfaVerifiedAt;
    });
  }
}
