import 'package:auth/auth.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:shell_core/shell_core.dart';
import 'package:utils/utils.dart';

import 'demo_profiles.dart';
import 'pages/forbidden_page.dart';
import 'pages/login_page.dart';
import 'pages/step_up_page.dart';

/// The shell's own routes: root, login, forbidden and step-up.
final class ShellRoutes {
  ShellRoutes({
    required this._paths,
    required this._session,
    required this._navigator,
    required this._stepUp,
    required this._onSignOut,
    required this._demoProfiles,
    this._clock = systemClock,
    this._connection,
  });

  final ShellPaths _paths;
  final ValueNotifier<UserSession> _session;
  final ShellNavigator _navigator;
  final StepUpRequests _stepUp;
  final Future<void> Function() _onSignOut;
  final List<DemoProfile> _demoProfiles;
  final Clock _clock;
  final IdentityConnection? _connection;

  /// The four routes, in this order: root, login, forbidden, step-up. Throws
  /// [StateError] when the paths have no step-up page.
  List<RouteBase> build() {
    final stepUpPath = _paths.stepUp;
    if (stepUpPath == null) {
      throw StateError('ShellRoutes needs a step-up path');
    }
    return <RouteBase>[
      GoRoute(path: '/', redirect: (context, state) => _navigator.landing()),
      GoRoute(
        path: _paths.login,
        builder: (context, state) => LoginPage(
          session: _session,
          demoProfiles: _demoProfiles,
          from: state.uri.queryParameters['from'],
          connection: _connection,
        ),
      ),
      GoRoute(
        path: _paths.forbidden,
        builder: (context, state) => ForbiddenPage(onSignOut: _onSignOut),
      ),
      GoRoute(
        path: stepUpPath,
        redirect: (context, state) =>
            _session.value.isAuthenticated ? null : _paths.login,
        builder: (context, state) => StepUpPage(
          session: _session,
          from: state.uri.queryParameters['from'],
          clock: _clock,
          onResult: _stepUp.isRequest(state.extra) ? _stepUp.complete : null,
          connection: _connection,
        ),
      ),
    ];
  }
}
