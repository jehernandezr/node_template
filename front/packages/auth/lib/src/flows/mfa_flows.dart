import 'package:contracts/contracts.dart';
import 'package:flutter/foundation.dart';

import '../identity_connection.dart';
import '../session_manager.dart';
import 'mfa_methods.dart';
import 'mfa_state.dart';

/// Shared state of the sign-in and the step-up: one [MfaState] at a time.
///
/// The forms only draw [state] and call the actions. Which step each error
/// resets lives here, so it is tested without mounting widgets.
abstract base class MfaFlow extends ChangeNotifier {
  /// Starts the flow in [initial], idle by default.
  MfaFlow({MfaState initial = const MfaIdle()}) : _state = initial;

  MfaState _state;
  bool _disposed = false;

  /// What the flow is doing now.
  MfaState get state => _state;

  /// Methods of the pending challenge that this flow can complete, in the
  /// server's order.
  List<MfaFactor> get methods => [
    for (final method in _state.pending?.methods ?? const <MfaFactor>[])
      if (codeMfaMethods.contains(method)) method,
  ];

  /// Errors that need a new challenge with the same `mfaToken`.
  Set<IdentityErrorCode> get _challengeResetCodes;

  MfaStep get _step => switch (_state) {
    final MfaStep step => step,
    MfaBusy(:final step) => step,
    MfaFailed(:final step) => step,
  };

  /// Runs [call] with the flow busy and turns its failures into [MfaFailed].
  /// [call] names the step the flow moves to on success through the callback
  /// it receives; without one the flow goes back to where it was. Returns the
  /// result, or null when it failed.
  ///
  /// Only exceptions are caught: a programming error (`TypeError`,
  /// `StateError`) escapes as is, after the flow leaves [MfaBusy].
  ///
  /// Network, timeout or closed session: a generic message, never the text of the exception.
  ///
  /// Still busy here only when an error escaped the handlers above.
  Future<T?> _run<T>(
    Future<T> Function(void Function(MfaStep next) advance) call,
  ) async {
    final from = _step;
    final busy = MfaBusy(from);
    MfaStep? next;
    _emit(busy);
    try {
      final result = await call((step) => next = step);
      _emit(next ?? from);
      return result;
    } on ApiErrorException catch (error) {
      final code = error.problem.code;
      _emit(MfaFailed(code, _stepAfterFailure(from, code)));
    } on ContractViolationException {
      _emit(MfaFailed(PlatformErrorCode.validationInvalidInput.code, from));
    } on Exception {
      _emit(MfaFailed(PlatformErrorCode.internalUnexpected.code, from));
    } finally {
      if (identical(_state, busy)) _emit(from);
    }
    return null;
  }

  MfaStep _stepAfterFailure(MfaStep from, String code) {
    final identity = IdentityErrorCode.fromCode(code);
    if (identity == IdentityErrorCode.mfaTokenInvalid) return const MfaIdle();
    if (_challengeResetCodes.contains(identity) && from is MfaAwaitingCode) {
      return MfaAwaitingMethod(from.pending);
    }
    return from;
  }

  void _emit(MfaState next) {
    _state = next;
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

/// Real sign-in against identity.
///
/// First email and password ([signIn]). When identity asks for a second
/// factor, the user picks a method ([requestChallenge]) and verifies the code
/// ([verify]). Once the session is open it loads its access, and the action
/// returns true.
final class SignInFlow extends MfaFlow {
  /// Sign-in flow over [_connection].
  SignInFlow(this._connection);

  final IdentityConnection _connection;

  SessionManager get _manager => _connection.sessionManager;

  @override
  Set<IdentityErrorCode> get _challengeResetCodes => const {
    IdentityErrorCode.mfaCodeExpired,
    IdentityErrorCode.mfaTooManyAttempts,
  };

  /// Sends the credentials. Returns true when the session is open and false
  /// when it failed or a second factor is missing ([MfaAwaitingMethod]).
  Future<bool> signIn({
    required String email,
    required String password,
  }) async =>
      await _run((advance) async {
        final response = await _manager.signIn(
          SignInRequest(email: email, password: password),
        );
        final pending = response.mfa;
        if (pending != null) {
          advance(MfaAwaitingMethod(pending));
          return false;
        }
        await _connection.reloadAccess();
        return true;
      }) ??
      false;

  /// Asks for the challenge of [method] for the pending second factor.
  Future<void> requestChallenge(MfaFactor method) async {
    final pending = state.pending;
    if (pending == null) {
      throw StateError('There is no pending second factor');
    }
    await _run((advance) async {
      final challenge = await _manager.requestMfaChallenge(
        mfaToken: pending.mfaToken,
        method: method,
      );
      advance(MfaAwaitingCode(pending, challenge));
    });
  }

  /// Verifies [code] for the active challenge and registers the device when
  /// there is a device key. Returns true when the session is open.
  Future<bool> verify(String code) async {
    final pending = state.pending;
    final challenge = state.challenge;
    if (pending == null || challenge == null) {
      throw StateError('There is no active challenge');
    }
    return await _run((_) async {
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

/// Step-up of an open session against identity.
///
/// [start] opens the step-up and brings the offered methods; the user picks
/// one ([requestChallenge]) and verifies the code ([verify]). The session
/// adopts the new access token, which carries the fresh second factor.
///
/// Starts busy because whoever creates it calls [start] right away.
final class StepUpFlow extends MfaFlow {
  /// Step-up flow of the session that [_manager] holds.
  StepUpFlow(this._manager) : super(initial: const MfaBusy(MfaIdle()));

  final SessionManager _manager;

  @override
  Set<IdentityErrorCode> get _challengeResetCodes => const {
    IdentityErrorCode.mfaCodeExpired,
    IdentityErrorCode.mfaTooManyAttempts,
    IdentityErrorCode.mfaMethodUnavailable,
  };

  /// Opens the step-up. It can be repeated after a failure.
  Future<void> start() => _run((advance) async {
    advance(MfaAwaitingMethod(await _manager.startStepUp()));
  });

  /// Asks for the challenge of [method] for the open step-up.
  Future<void> requestChallenge(MfaFactor method) async {
    final pending = state.pending;
    if (pending == null) throw StateError('The step-up is not open');
    await _run((advance) async {
      final challenge = await _manager.requestStepUpChallenge(
        mfaToken: pending.mfaToken,
        method: method,
      );
      advance(MfaAwaitingCode(pending, challenge));
    });
  }

  /// Verifies [code] and returns the new `mfaVerifiedAt`, or null on failure.
  Future<DateTime?> verify(String code) async {
    final pending = state.pending;
    final challenge = state.challenge;
    if (pending == null || challenge == null) {
      throw StateError('There is no active challenge');
    }
    return _run((_) async {
      final result = await _manager.verifyStepUp(
        mfaToken: pending.mfaToken,
        challengeId: challenge.challengeId,
        code: code,
      );
      return result.mfaVerifiedAt;
    });
  }
}
