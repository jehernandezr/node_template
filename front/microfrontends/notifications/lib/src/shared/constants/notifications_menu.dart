import 'package:shell_core/shell_core.dart';

/// Id del microfrontend y primer segmento de sus rutas.
const MicrofrontendId notificationsId = MicrofrontendId('notifications');

/// Etiqueta del menú. El shell la dibuja antes de cargar el microfrontend,
/// así que viaja con el manifiesto y no en los ARB diferidos.
const MenuLabel notificationsMenuLabel = MenuLabel({
  'es': 'Notificaciones',
  'en': 'Notifications',
});
