/// Pantallas del microfrontend de notificaciones. Esta librería se importa como
/// `deferred` desde `lib/mf_notifications.dart`, así que sólo se descarga al abrir una ruta.
library;

import 'package:material_ui/material_ui.dart';

import '../l10n/generated/notifications_localizations.dart';

export 'inbox_screen.dart';
export 'preferences_screen.dart';

/// Envuelve [child] con los textos del microfrontend. Se llama dentro de la
/// página diferida, así las cadenas viajan en el chunk diferido.
Widget withNotificationsLocalizations(BuildContext context, Widget child) =>
    Localizations.override(
      context: context,
      delegates: const [NotificationsLocalizations.delegate],
      child: child,
    );
