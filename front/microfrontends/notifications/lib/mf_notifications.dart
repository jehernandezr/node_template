/// Microfrontend `notifications`: manifiesto que registran los shells web y
/// móvil.
///
/// Este archivo viaja en el bundle inicial. No importa nada de `src/data`,
/// `src/screens` ni `src/l10n` sin `deferred as`; el ciclo de vida tampoco.
library;

import 'package:shell_core/shell_core.dart';

import 'src/lifecycle/notifications_lifecycle.dart';
import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/notifications_paths.dart';

export 'src/lifecycle/notifications_lifecycle.dart';
export 'src/shared/constants/notifications_paths.dart';

/// Manifiesto registrado por los shells. Las rutas viven bajo
/// `/notifications`; pantallas, datos y textos se cargan de forma diferida.
final MicrofrontendManifest notificationsManifest = MicrofrontendManifest(
  id: MicrofrontendId.notifications,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.authenticated(),
  menu: const [
    MenuEntry(
      labelKey: 'menuNotifications',
      path: NotificationsPaths.inbox,
      order: 30,
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
