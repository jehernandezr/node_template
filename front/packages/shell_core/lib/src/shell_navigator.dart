import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:utils/utils.dart';

import 'enums.dart';
import 'microfrontend_registry.dart';
import 'shell_access.dart';
import 'user_session.dart';

/// Decides where the shell sends the user: the first menu entry, the landing
/// page and the sign-out destination.
final class ShellNavigator {
  /// Creates a navigator over [registry] and [session]. [clock] is the time of
  /// the access checks behind [home].
  ShellNavigator({
    required this._registry,
    required this._session,
    required this._platform,
    required this._paths,
    this._clock = systemClock,
  });

  final MicrofrontendRegistry _registry;
  final ValueNotifier<UserSession> _session;
  final AppPlatform _platform;
  final ShellPaths _paths;
  final Clock _clock;
  GoRouter? _router;

  /// Called once, after the router exists. Throws [StateError] when called
  /// twice.
  void attach(GoRouter router) {
    if (_router != null) throw StateError('ShellNavigator is already attached');
    _router = router;
  }

  /// Path of the first menu entry the session sees, or null.
  String? home() {
    final entries = _registry.menuFor(_session.value, _platform, now: _clock());
    return entries.isEmpty ? null : entries.first.path;
  }

  /// [home], else forbidden for a signed-in user and login for anonymous.
  String landing() =>
      home() ??
      (_session.value.isAuthenticated ? _paths.forbidden : _paths.login);

  /// Resets the session to anonymous and goes to the plain login page. The
  /// location left behind is not passed as `from`. Throws [StateError] before
  /// [attach].
  Future<void> signOutAndGoToLogin() async {
    final router = _router;
    if (router == null) throw StateError('ShellNavigator is not attached');
    _session.value = UserSession.anonymous();
    router.go(_paths.login);
  }
}
