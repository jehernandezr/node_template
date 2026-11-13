import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_notifications/mf_notifications.dart';
import 'package:mf_notifications/src/l10n/generated/notifications_localizations.dart';
import 'package:mf_notifications/src/shared/types/types.dart';
import 'package:shell_core/shell_core.dart';

export 'package:mf_notifications/src/data/fake_notifications_repository.dart';
export 'package:mf_notifications/src/data/notifications_repository.dart';
export 'package:mf_notifications/src/l10n/notification_labels.dart';
export 'package:mf_notifications/src/shared/types/types.dart';

const _delegates = [
  AppLocalizations.delegate,
  NotificationsLocalizations.delegate,
  ...GlobalMaterialLocalizations.delegates,
];

const _locales = [Locale('es'), Locale('en')];

/// App mínima en español con los delegados que usa el shell y el microfrontend.
Widget testApp(Widget home, {Locale locale = const Locale('es')}) =>
    MaterialApp(
      locale: locale,
      supportedLocales: _locales,
      localizationsDelegates: _delegates,
      home: home,
    );

/// App con las rutas reales del manifiesto, montadas con
/// `manifest.buildRoutes` sobre [scope]. Como el shell, solo registra los
/// delegados compartidos: los textos del microfrontend los agrega la página
/// diferida.
Widget routedApp(
  MicrofrontendScope scope, {
  String initialLocation = NotificationsPaths.inbox,
  Locale locale = const Locale('es'),
}) => MaterialApp.router(
  locale: locale,
  supportedLocales: _locales,
  localizationsDelegates: const [
    AppLocalizations.delegate,
    ...GlobalMaterialLocalizations.delegates,
  ],
  routerConfig: GoRouter(
    initialLocation: initialLocation,
    routes: notificationsManifest.buildRoutes(deferredPage, () => scope),
  ),
);

/// Scope de una identidad, como el que crea el runtime.
MicrofrontendScope testScope({UserSession? session, ShellEventBus? bus}) =>
    MicrofrontendScope(
      DefaultShellServices(
        session: session ?? UserSession.anonymous(),
        eventBus: bus ?? ShellEventBus(),
      ),
    );

/// Textos en español del microfrontend, para buscar en los widgets.
final NotificationsLocalizations esText = lookupNotificationsLocalizations(
  const Locale('es'),
);

/// Textos en inglés del microfrontend.
final NotificationsLocalizations enText = lookupNotificationsLocalizations(
  const Locale('en'),
);

/// Notificación de prueba.
AppNotification notificationItem(
  String id, {
  bool read = false,
  NotificationType type = NotificationType.taskUpdated,
}) => AppNotification(
  id: id,
  type: type,
  title: 'Título $id',
  body: 'Cuerpo $id',
  createdAt: DateTime(2026, 11, 10),
  read: read,
);
