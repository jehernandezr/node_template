import 'user_session.dart';

/// Services that belong to one identity (user and tenant).
///
/// The runtime builds a new instance with its `servicesFactory` every time the
/// identity changes, so nothing cached from one user can reach the next one.
///
/// There is no event bus here on purpose (ADR 0018): a lifecycle emits with
/// `ShellContext.emit` and a screen with `MicrofrontendScope.emit`, which drop
/// events once the identity rotates.
abstract interface class ShellServices {
  /// Session of the identity these services belong to, as it was when the
  /// services were built. Screens read the live session (for example the MFA
  /// time after a step-up) with `context.can` or `AccessGate`.
  UserSession get session;

  /// Signs the current identity out. The shell decides what that means.
  Future<void> signOut();

  /// Asks the user for a recent second factor through the shell's step-up
  /// flow and returns whether it was verified.
  ///
  /// On success the shell has already updated `UserSession.mfaVerifiedAt`
  /// (and, with a real session, the tokens), so `AccessRule.mfa` rules pass.
  /// Returns false when the user cancels or the shell has no step-up flow.
  Future<bool> requestStepUp();

  /// Extra service of type [T] supplied by the shell, or null when absent.
  T? extra<T extends Object>();
}

/// Plain [ShellServices] built from its values.
///
/// [extras] maps a service type to its instance; [extra] looks up by exact type.
final class DefaultShellServices implements ShellServices {
  /// Creates services for [session]. [onSignOut] runs on [signOut] and
  /// [onStepUp] on [requestStepUp].
  DefaultShellServices({
    required this.session,
    this.onSignOut,
    this.onStepUp,
    Map<Type, Object> extras = const {},
  }) : _extras = Map.unmodifiable(extras);

  @override
  final UserSession session;

  /// Callback behind [signOut]. Null means signing out does nothing.
  final Future<void> Function()? onSignOut;

  /// Callback behind [requestStepUp]. Null means there is no step-up flow and
  /// [requestStepUp] returns false.
  final Future<bool> Function()? onStepUp;

  final Map<Type, Object> _extras;

  @override
  Future<void> signOut() => onSignOut?.call() ?? Future<void>.value();

  @override
  Future<bool> requestStepUp() => onStepUp?.call() ?? Future<bool>.value(false);

  @override
  T? extra<T extends Object>() => _extras[T] as T?;
}
