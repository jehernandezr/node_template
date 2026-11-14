import 'package:auth/auth.dart';
import 'package:mf_account/mf_account.dart' show accountManifest;
import 'package:mf_assistant/mf_assistant.dart' show assistantManifest;
import 'package:mf_backoffice/mf_backoffice.dart' show backofficeManifest;
import 'package:mf_billing/mf_billing.dart' show billingManifest;
import 'package:mf_notifications/mf_notifications.dart'
    show notificationsManifest;
import 'package:mf_tasks/mf_tasks.dart' show tasksManifest;
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/shell_host.dart';

import 'pages/web_shell_scaffold.dart';

/// Microfrontends the web shell composes, in registration order.
final List<MicrofrontendManifest> webManifests = [
  accountManifest,
  tasksManifest,
  notificationsManifest,
  assistantManifest,
  billingManifest,
  backofficeManifest,
];

/// The web shell: [webManifests] in the [WebShellScaffold] frame.
///
/// With a [connection] (the app runs with `API_BASE_URL`) the shell is live;
/// without one it runs on the demo profiles. Tests may pass their own
/// [manifests].
ShellHost buildWebHost({
  IdentityConnection? connection,
  List<MicrofrontendManifest>? manifests,
}) => ShellHost(
  platform: AppPlatform.web,
  manifests: manifests ?? webManifests,
  connection: connection,
  demoProfiles: const [
    DemoProfile.customer,
    DemoProfile.tenantAdmin,
    DemoProfile.superAdmin,
  ],
  scaffold: (context, host, location, child) =>
      WebShellScaffold(host: host, location: location, child: child),
);
