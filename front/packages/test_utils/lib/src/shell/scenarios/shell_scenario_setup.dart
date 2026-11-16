import 'package:auth/auth.dart';
import 'package:shell_core/shell_core.dart';

import '../../auth/fake_auth_repository.dart';
import '../../clock/fake_clock.dart';

/// How a scenario wants the app pumped.
final class ShellScenarioSetup {
  /// Creates the setup. The suite fills [connection] when a scenario is live.
  const ShellScenarioSetup({
    required this.manifests,
    required this.clock,
    this.session,
    this.connection,
    this.auth,
    this.initialLocation = '/',
  });

  /// Manifests the shell registers: the scenario probe and whatever else the
  /// app adds on its own.
  final List<MicrofrontendManifest> manifests;

  /// Clock of the shell and of the runtime.
  final FakeClock clock;

  /// Session the fixture writes before mounting the app, so the first
  /// location is decided for it. Null starts anonymous.
  final UserSession? session;

  /// Real identity connection built over [auth]. Null means demo profiles.
  final IdentityConnection? connection;

  /// Repository behind [connection]; the scenario configures its results.
  final FakeAuthRepository? auth;

  /// Location the router opens first.
  final String initialLocation;

  /// True when the shell runs over a real connection.
  bool get live => connection != null;
}
