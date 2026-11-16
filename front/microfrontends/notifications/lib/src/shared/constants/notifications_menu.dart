import 'package:shell_core/shell_core.dart';

/// Id of the microfrontend and first segment of its routes.
const MicrofrontendId notificationsId = MicrofrontendId('notifications');

/// Menu label. The shell draws it before the microfrontend loads, so it ships
/// with the manifest and not in the deferred ARB files.
const MenuLabel notificationsMenuLabel = MenuLabel({
  'es': 'Notificaciones',
  'en': 'Notifications',
});
