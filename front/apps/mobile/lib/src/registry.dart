import 'package:mf_account/mf_account.dart' show accountManifest;
import 'package:mf_assistant/mf_assistant.dart' show assistantManifest;
import 'package:mf_notifications/mf_notifications.dart'
    show notificationsManifest;
import 'package:mf_tasks/mf_tasks.dart' show tasksManifest;
import 'package:mf_verifier/mf_verifier.dart' show verifierManifest;
import 'package:shell_core/shell_core.dart';

/// Registry with the five microfrontends that the mobile shell composes.
MicrofrontendRegistry buildMobileRegistry() => MicrofrontendRegistry()
  ..register(accountManifest)
  ..register(tasksManifest)
  ..register(notificationsManifest)
  ..register(assistantManifest)
  ..register(verifierManifest);
