/// Microfrontend `account`: manifest consumed by the web and mobile shells.
///
/// This file imports only the shell contracts, the router, Material and the
/// deferred screens library. Repositories and texts live behind `deferred`.
library;

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;

/// Manifest registered by the shells. Routes live under `/account`.
final MicrofrontendManifest accountManifest = MicrofrontendManifest(
  id: MicrofrontendId.account,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.authenticated(),
  menu: const [MenuEntry(labelKey: 'menuAccount', path: '/account', order: 10)],
  routes: _routes,
);

List<RouteBase> _routes(
  ScreenLoader load,
  MicrofrontendScope Function() scope,
) => [
  GoRoute(
    path: '/account',
    builder: (context, state) => _page(
      load,
      () => screens.buildAccountOverviewScreen(scope()),
    ),
    routes: [
      GoRoute(
        path: 'sessions',
        builder: (context, state) => _page(
          load,
          () => screens.buildAccountSessionsScreen(scope()),
        ),
      ),
      GoRoute(
        path: 'devices',
        builder: (context, state) => _page(
          load,
          () => screens.buildAccountDevicesScreen(scope()),
        ),
      ),
      GoRoute(
        path: 'security',
        builder: (context, state) => _page(
          load,
          () => screens.buildAccountSecurityScreen(scope()),
        ),
      ),
      GoRoute(
        path: 'agreements',
        builder: (context, state) => _page(
          load,
          () => screens.buildAccountAgreementsScreen(scope()),
        ),
      ),
    ],
  ),
];

Widget _page(ScreenLoader load, Widget Function() builder) => load(
  loadLibrary: screens.loadLibrary,
  builder: builder,
  loading: const Center(child: CircularProgressIndicator()),
);
