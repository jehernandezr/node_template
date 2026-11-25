/// Microfrontend `notifications`: manifest registered by the web and mobile
/// shells.
///
/// This file ships in the initial bundle. It imports nothing from `src/data`,
/// `src/screens` or `src/l10n` without `deferred as`; neither does the
/// lifecycle.
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

/// Manifest registered by the shells. Routes live under `/notifications`;
/// screens, data and copy load as deferred libraries.
///
/// It serves demo and live shells: in live mode the data comes from the
/// notifications API and its server-sent events.
final MicrofrontendManifest notificationsManifest = MicrofrontendManifest(
  id: notificationsId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.authenticated(),
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
    ScreenRoute.deferred(
      NotificationsPaths.inbox,
      library: screens.loadLibrary,
      build: (scope, params) => screens.NotificationsScreens.inbox(scope),
      routes: [
        ScreenRoute.deferred(
          NotificationsPaths.preferencesSegment,
          library: screens.loadLibrary,
          build: (scope, params) =>
              screens.NotificationsScreens.preferences(scope),
        ),
      ],
    ),
  ],
);

int _unreadCount(UnreadCountChanged event) => event.count;
