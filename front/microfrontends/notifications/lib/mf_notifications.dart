/// Microfrontend `notifications`: manifiesto que registran los shells web y
/// móvil.
///
/// Este archivo viaja en el bundle inicial. No importa nada de `src/data`,
/// `src/screens` ni `src/l10n` sin `deferred as`; el ciclo de vida tampoco.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/lifecycle/notifications_lifecycle.dart';
import 'src/lifecycle/unread_count_changed.dart';
import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/notifications_menu.dart';
import 'src/shared/constants/notifications_paths.dart';

export 'src/lifecycle/notifications_lifecycle.dart';
export 'src/lifecycle/unread_count_changed.dart';
export 'src/shared/constants/notifications_paths.dart';

/// Manifiesto registrado por los shells. Las rutas viven bajo
/// `/notifications`; pantallas, datos y textos se cargan de forma diferida.
///
/// Solo modo demo: notificaciones aún no tiene contrato en el backend.
final MicrofrontendManifest notificationsManifest = MicrofrontendManifest(
  id: notificationsId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.authenticated(),
  modes: const {ShellMode.demo},
  menu: const [
    MenuEntry(
      label: notificationsMenuLabel,
      path: NotificationsPaths.inbox,
      order: 30,
      icon: Icons.notifications_none,
      selectedIcon: Icons.notifications,
      badge: MenuBadge<UnreadCountChanged>(_unreadCount),
    ),
  ],
  lifecycleFactory: NotificationsLifecycle.new,
  screens: [
    ScreenRoute(
      path: NotificationsPaths.inbox,
      loadLibrary: screens.loadLibrary,
      builder: (scope, {params = const {}}) => screens.buildInboxScreen(scope),
      routes: [
        ScreenRoute(
          path: NotificationsPaths.preferencesSegment,
          loadLibrary: screens.loadLibrary,
          builder: (scope, {params = const {}}) =>
              screens.buildPreferencesScreen(scope),
        ),
      ],
    ),
  ],
);

int _unreadCount(UnreadCountChanged event) => event.count;
