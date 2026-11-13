/// Pantallas del microfrontend de notificaciones. Esta librería se importa como
/// `deferred` desde `lib/mf_notifications.dart`, así que solo se descarga al
/// abrir una ruta, junto con los datos y los textos que usa.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/notifications_scope.dart';
import '../l10n/generated/notifications_localizations.dart';
import 'inbox_screen.dart';
import 'preferences_screen.dart';

export 'inbox_screen.dart';
export 'preferences_screen.dart';

/// Bandeja del [scope], con los textos del microfrontend.
Widget buildInboxScreen(MicrofrontendScope scope) => NotificationsLocalized(
  child: NotificationsInboxScreen(repository: notificationsRepositoryOf(scope)),
);

/// Preferencias del [scope], con los textos del microfrontend.
Widget buildPreferencesScreen(MicrofrontendScope scope) =>
    NotificationsLocalized(
      child: NotificationsPreferencesScreen(
        repository: notificationsRepositoryOf(scope),
      ),
    );

/// Agrega [NotificationsLocalizations] a [child] con el idioma de la app.
///
/// Vive en el chunk diferido, así las cadenas del microfrontend no viajan en
/// el bundle inicial.
class NotificationsLocalized extends StatelessWidget {
  const NotificationsLocalized({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Localizations.override(
    context: context,
    delegates: const [NotificationsLocalizations.delegate],
    child: child,
  );
}
