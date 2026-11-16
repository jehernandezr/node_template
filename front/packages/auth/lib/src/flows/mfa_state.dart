import 'package:contracts/contracts.dart';

/// What a sign-in or step-up flow is doing. A [MfaStep] is never busy or in
/// error; [MfaBusy] and [MfaFailed] wrap the step the flow was at.
sealed class MfaState {
  const MfaState();

  /// Pending second-factor challenge with its methods, or null.
  PendingMfa? get pending;

  /// Challenge of the chosen method, or null while there is none.
  MfaChallenge? get challenge;

  /// Public code of the last error, or null.
  String? get errorCode;

  /// Whether a call is in flight.
  bool get isBusy;
}

/// A resting point of the flow.
sealed class MfaStep extends MfaState {
  const MfaStep();

  @override
  String? get errorCode => null;

  @override
  bool get isBusy => false;
}

/// Credentials step, or nothing pending.
final class MfaIdle extends MfaStep {
  const MfaIdle();

  @override
  PendingMfa? get pending => null;

  @override
  MfaChallenge? get challenge => null;
}

/// The server asked for a second factor; the user picks a method.
final class MfaAwaitingMethod extends MfaStep {
  const MfaAwaitingMethod(this.pending);

  @override
  final PendingMfa pending;

  @override
  MfaChallenge? get challenge => null;
}

/// A challenge is active; the user types the code.
final class MfaAwaitingCode extends MfaStep {
  const MfaAwaitingCode(this.pending, this.challenge);

  @override
  final PendingMfa pending;

  @override
  final MfaChallenge challenge;
}

/// A call is in flight; [step] is where the flow was.
final class MfaBusy extends MfaState {
  const MfaBusy(this.step);

  /// Step the flow was at when the call started.
  final MfaStep step;

  @override
  PendingMfa? get pending => step.pending;

  @override
  MfaChallenge? get challenge => step.challenge;

  @override
  String? get errorCode => null;

  @override
  bool get isBusy => true;
}

/// The last call failed with [code]; [step] is where the flow goes back to.
final class MfaFailed extends MfaState {
  const MfaFailed(this.code, this.step);

  /// Public error code, for `errorMessage`.
  final String code;

  /// Step the flow returns to after the failure.
  final MfaStep step;

  @override
  PendingMfa? get pending => step.pending;

  @override
  MfaChallenge? get challenge => step.challenge;

  @override
  String? get errorCode => code;

  @override
  bool get isBusy => false;
}
