import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shell_core/shell_core.dart';

import 'shell_scenario_setup.dart';

/// What a shared scenario needs from the app under test.
abstract interface class ShellFixture {
  /// Pumps the app with [setup] and returns handles to observe it. The caller
  /// closes it with [ShellUnderTest.close] inside the test body.
  Future<ShellUnderTest> pump(WidgetTester tester, ShellScenarioSetup setup);
}

/// Handles to observe and close a pumped app.
final class ShellUnderTest {
  /// Creates the handles.
  const ShellUnderTest({
    required this.session,
    required this.currentLocation,
    required this.router,
    required this.close,
  });

  /// Session the shell reads and writes.
  final ValueNotifier<UserSession> session;

  /// Current location with its query, such as `/login?from=%2Fprobe`.
  final String Function() currentLocation;

  /// Router of the app.
  final GoRouter router;

  /// Lets the runtime go idle, unmounts the app and disposes the host. It
  /// runs inside the test body, never in a tear-down: a tear-down runs after
  /// the fake clock stops.
  final Future<void> Function() close;
}
