/// Microfrontend `notifications`: manifest consumed by the web and mobile shells.
library;

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/lifecycle/notifications_lifecycle.dart';
import 'src/screens/screens.dart' deferred as screens;

export 'src/data/fake_notifications_repository.dart';
export 'src/data/notification_models.dart';
export 'src/data/notifications_repository.dart';
export 'src/lifecycle/notifications_lifecycle.dart';

/// Manifest registered by the shells. Routes live under `/notifications`.
/// Only the screens are deferred; the lifecycle is eager.
final MicrofrontendManifest notificationsManifest = MicrofrontendManifest(
  id: MicrofrontendId.notifications,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.authenticated(),
  menu: const [
    MenuEntry(labelKey: 'menuNotifications', path: '/notifications', order: 30),
  ],
  lifecycle: NotificationsLifecycle(),
  routes: (load, scope) => [
    GoRoute(
      path: '/notifications',
      builder: (context, state) => load(
        loadLibrary: screens.loadLibrary,
        builder: () => screens.withNotificationsLocalizations(
          context,
          screens.buildInboxScreen(scope()),
        ),
        loading: const Center(child: CircularProgressIndicator()),
      ),
      routes: [
        GoRoute(
          path: 'preferences',
          builder: (context, state) => load(
            loadLibrary: screens.loadLibrary,
            builder: () => screens.withNotificationsLocalizations(
              context,
              screens.buildPreferencesScreen(scope()),
            ),
            loading: const Center(child: CircularProgressIndicator()),
          ),
        ),
      ],
    ),
  ],
);
