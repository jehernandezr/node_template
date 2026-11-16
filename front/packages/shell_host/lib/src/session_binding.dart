import 'dart:async';

import 'package:auth/auth.dart';
import 'package:flutter/foundation.dart';
import 'package:shell_core/shell_core.dart';

/// Follows the access of a real connection: the session mirrors it, and when
/// identity closes the session the user goes back to sign-in.
final class SessionBinding {
  SessionBinding({
    required this._connection,
    required this._session,
    required this._navigator,
  });

  final IdentityConnection _connection;
  final ValueNotifier<UserSession> _session;
  final ShellNavigator _navigator;
  bool _listening = false;

  /// Starts listening to the connection's access.
  void start() {
    if (_listening) return;
    _listening = true;
    _connection.access.addListener(_onAccessChanged);
  }

  /// Stops listening. Calling it twice does nothing.
  void stop() {
    if (!_listening) return;
    _listening = false;
    _connection.access.removeListener(_onAccessChanged);
  }

  void _onAccessChanged() {
    final access = _connection.access.value;
    if (access != null) {
      _session.value = UserSession.fromAccess(access);
    } else if (_session.value.isAuthenticated) {
      unawaited(_navigator.signOutAndGoToLogin());
    }
  }
}
