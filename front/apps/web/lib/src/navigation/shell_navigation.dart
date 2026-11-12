import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

/// Outline and filled icons for each microfrontend.
({IconData outlined, IconData filled}) menuIcons(MicrofrontendId? id) => switch (id) {
  MicrofrontendId.account => (outlined: Icons.person_outline, filled: Icons.person),
  MicrofrontendId.tasks => (
    outlined: Icons.check_circle_outline,
    filled: Icons.check_circle,
  ),
  MicrofrontendId.notifications => (
    outlined: Icons.notifications_none,
    filled: Icons.notifications,
  ),
  MicrofrontendId.assistant => (outlined: Icons.smart_toy_outlined, filled: Icons.smart_toy),
  MicrofrontendId.billing => (outlined: Icons.receipt_long_outlined, filled: Icons.receipt_long),
  MicrofrontendId.backoffice => (
    outlined: Icons.admin_panel_settings_outlined,
    filled: Icons.admin_panel_settings,
  ),
  MicrofrontendId.verifier => (outlined: Icons.verified_user_outlined, filled: Icons.verified_user),
  null => (outlined: Icons.widgets_outlined, filled: Icons.widgets),
};
