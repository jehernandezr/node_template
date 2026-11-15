import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:shell_core/shell_core.dart';
import 'package:utils/utils.dart';

/// Asks for a recent second factor before a sensitive action.
///
/// The account never verifies codes itself: the shell runs the MFA flow and
/// updates `UserSession.mfaVerifiedAt`, so after a yes the [rule] passes and
/// the API stops answering `IDENTITY.MFA.STEP_UP_REQUIRED`.
final class StepUpGate {
  StepUpGate({
    required this._rule,
    required this._session,
    required this._clock,
    required this._request,
  });

  /// Reads the session and the clock of the nearest [ShellAccessScope]. Only
  /// a read-style lookup, so it is safe inside `ControllerBuilder.create`.
  factory StepUpGate.fromContext(
    BuildContext context, {
    required AccessRule rule,
    required Future<bool> Function() request,
  }) {
    final scope = ShellAccessScope.maybeRead(context);
    if (scope == null) {
      throw StateError('StepUpGate needs a ShellAccessScope above the screen');
    }
    return StepUpGate(
      rule: rule,
      session: scope.session,
      clock: scope.clock,
      request: request,
    );
  }

  final AccessRule _rule;
  final ValueListenable<UserSession> _session;
  final Clock _clock;
  final Future<bool> Function() _request;

  /// True when the session already passes the rule; otherwise asks the shell
  /// for a step-up and returns whether the user verified.
  Future<bool> ensure() async {
    if (_rule.allows(_session.value, now: _clock())) return true;
    return _request();
  }
}
