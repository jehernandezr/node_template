import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

/// Icon for each microfrontend, shown in the navigation.
IconData menuIcon(MicrofrontendId? id) => switch (id) {
  MicrofrontendId.account => Icons.person_outline,
  MicrofrontendId.tasks => Icons.check_circle_outline,
  MicrofrontendId.notifications => Icons.notifications_none,
  MicrofrontendId.assistant => Icons.auto_awesome_outlined,
  MicrofrontendId.verifier => Icons.verified_user_outlined,
  MicrofrontendId.billing => Icons.receipt_long_outlined,
  MicrofrontendId.backoffice => Icons.admin_panel_settings_outlined,
  null => Icons.circle_outlined,
};
