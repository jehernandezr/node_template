import 'package:api/api.dart';

import 'enums.dart';
import 'user_session.dart';

/// Services that belong to one identity (user and tenant).
///
/// The runtime builds a new instance with its `servicesFactory` every time the
/// identity changes, so nothing cached from one user can reach the next one.
///
/// There is no event bus here on purpose (ADR 0018): a lifecycle emits with
/// `ShellContext.emit` and a screen with `MicrofrontendScope.emit`, which drop
/// events once the identity rotates.
final class ShellServices {
  /// Creates the services of [session] in [mode]. [onSignOut] runs on
  /// [signOut] and [onStepUp] on [requestStepUp].
  ///
  /// Throws [ArgumentError] in [ShellMode.live] without [api]: a live shell
  /// that forgot its client must fail at startup, not show demo data.
  ShellServices({
    required this.session,
    required this.mode,
    ApiClient? api,
    this.onSignOut,
    this.onStepUp,
  }) : _api = api {
    if (mode == ShellMode.live && api == null) {
      throw ArgumentError.notNull('api');
    }
  }

  /// Session of the identity these services belong to, as it was when the
  /// services were built. Screens read the live session (for example the MFA
  /// time after a step-up) with `context.can` or `AccessGate`.
  final UserSession session;

  /// Whether repositories use the API or their in-memory demo data.
  final ShellMode mode;

  final ApiClient? _api;

  /// Callback behind [signOut]. Null means signing out does nothing.
  final Future<void> Function()? onSignOut;

  /// Callback behind [requestStepUp]. Null means there is no step-up flow and
  /// [requestStepUp] returns false.
  final Future<bool> Function()? onStepUp;

  /// Client of the API, signed with the session.
  ///
  /// Throws [StateError] in [ShellMode.demo]: a repository that asks for it
  /// there is choosing the wrong implementation.
  ApiClient get api =>
      _api ?? (throw StateError('There is no ApiClient in ${mode.name} mode'));

  /// Signs the current identity out. The shell decides what that means.
  Future<void> signOut() => onSignOut?.call() ?? Future<void>.value();

  /// Asks the user for a recent second factor through the shell's step-up
  /// flow and returns whether it was verified.
  ///
  /// On success the shell has already updated `UserSession.mfaVerifiedAt`
  /// (and, with a real session, the tokens), so `AccessRule.mfa` rules pass.
  /// Returns false when the user cancels or the shell has no step-up flow.
  Future<bool> requestStepUp() => onStepUp?.call() ?? Future<bool>.value(false);
}
