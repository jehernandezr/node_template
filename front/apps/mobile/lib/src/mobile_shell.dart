import 'package:auth/auth.dart';
import 'package:mf_account/mf_account.dart' show accountManifest;
import 'package:mf_assistant/mf_assistant.dart' show assistantManifest;
import 'package:mf_notifications/mf_notifications.dart'
    show notificationsManifest;
import 'package:mf_reports/mf_reports.dart' show reportsManifest;
import 'package:mf_tasks/mf_tasks.dart' show tasksManifest;
import 'package:mf_verifier/mf_verifier.dart' show verifierManifest;
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/shell_host.dart';
import 'package:utils/utils.dart';

import 'shell/mobile_shell_scaffold.dart';

/// Microfrontends the mobile shell composes, in registration order.
final List<MicrofrontendManifest> mobileManifests = [
  accountManifest,
  tasksManifest,
  notificationsManifest,
  reportsManifest,
  assistantManifest,
  verifierManifest,
];

/// The mobile shell: [mobileManifests] in the [MobileShellScaffold] frame.
///
/// With a [connection] (the app runs with `API_BASE_URL`) the shell is live;
/// without one it runs on the demo profiles. Tests may pass their own
/// [manifests] and a [clock].
ShellHost buildMobileHost({
  IdentityConnection? connection,
  List<MicrofrontendManifest>? manifests,
  Clock clock = systemClock,
}) => ShellHost(
  platform: AppPlatform.mobile,
  manifests: manifests ?? mobileManifests,
  connection: connection,
  clock: clock,
  demoProfiles: const [DemoProfile.customer, DemoProfile.customerNoAssistant],
  scaffold: (context, host, location, child) =>
      MobileShellScaffold(host: host, location: location, child: child),
);
