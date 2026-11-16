import 'package:shell_core/shell_core.dart';

/// Scopes of a test identity, as the runtime creates them.
abstract final class NotificationsScopes {
  /// A demo scope for [session] (anonymous by default) on [bus] (a new one
  /// by default). Each call creates a new scope.
  static MicrofrontendScope create({
    UserSession? session,
    ShellEventBus? bus,
  }) => MicrofrontendScope(
    ShellServices(
      mode: ShellMode.demo,
      session: session ?? UserSession.anonymous(),
    ),
    eventBus: bus ?? ShellEventBus(),
  );
}
