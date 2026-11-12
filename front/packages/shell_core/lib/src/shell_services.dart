import 'shell_event_bus.dart';
import 'user_session.dart';

/// Services that belong to one identity (user and tenant).
///
/// The runtime builds a new instance with its `servicesFactory` every time the
/// identity changes, so nothing cached from one user can reach the next one.
abstract interface class ShellServices {
  /// Session of the identity these services belong to.
  UserSession get session;

  /// Bus shared by the shell and its microfrontends.
  ShellEventBus get eventBus;

  /// Signs the current identity out. The shell decides what that means.
  Future<void> signOut();

  /// Extra service of type [T] supplied by the shell, or null when absent.
  T? extra<T extends Object>();
}

/// Plain [ShellServices] built from its values.
///
/// [extras] maps a service type to its instance; [extra] looks up by exact type.
final class DefaultShellServices implements ShellServices {
  /// Creates services for [session]. [onSignOut] runs on [signOut].
  DefaultShellServices({
    required this.session,
    required this.eventBus,
    this.onSignOut,
    Map<Type, Object> extras = const {},
  }) : _extras = Map.unmodifiable(extras);

  @override
  final UserSession session;

  @override
  final ShellEventBus eventBus;

  /// Callback behind [signOut]. Null means signing out does nothing.
  final Future<void> Function()? onSignOut;

  final Map<Type, Object> _extras;

  @override
  Future<void> signOut() => onSignOut?.call() ?? Future<void>.value();

  @override
  T? extra<T extends Object>() => _extras[T] as T?;
}
