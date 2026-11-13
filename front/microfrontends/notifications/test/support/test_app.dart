import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_notifications/src/l10n/generated/notifications_localizations.dart';

export 'package:mf_notifications/src/l10n/notification_labels.dart';

/// App mínima en español con los delegados que usa el shell y el microfrontend.
Widget testApp(Widget home, {Locale locale = const Locale('es')}) =>
    MaterialApp(
      locale: locale,
      supportedLocales: const [Locale('es'), Locale('en')],
      localizationsDelegates: const [
        AppLocalizations.delegate,
        NotificationsLocalizations.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
      home: home,
    );

/// Textos en español del microfrontend, para buscar en los widgets.
final NotificationsLocalizations esText = lookupNotificationsLocalizations(
  const Locale('es'),
);
