/// Microfrontend `backoffice`: manifest consumed by the web shell.
///
/// This file is eager. It imports only `shell_core`, `go_router` and `material_ui`,
/// plus the deferred screens library. Models, repository, fake, localizations and
/// widgets are reachable only through that library, so customers never download them.
library;

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;

/// Manifest registered by the shells. Routes live under `/backoffice`.
final MicrofrontendManifest backofficeManifest = MicrofrontendManifest(
  id: MicrofrontendId.backoffice,
  platforms: {AppPlatform.web},
  access: AccessRule.platformRoles(PlatformRole.values),
  menu: const [MenuEntry(labelKey: 'menuBackoffice', path: '/backoffice', order: 90)],
  routes: _routes,
);

const Widget _loading = Center(child: CircularProgressIndicator());

List<RouteBase> _routes(ScreenLoader load, MicrofrontendScope Function() scope) {
  // The entry point is referenced inside the builder, so it is only touched after the library loads.
  Widget page(
    BuildContext context,
    Widget Function(BuildContext context, MicrofrontendScope scope) build,
  ) => load(
    loadLibrary: screens.loadLibrary,
    loading: _loading,
    builder: () => build(context, scope()),
  );

  return [
    GoRoute(
      path: '/backoffice',
      builder: (context, state) => page(context, (c, s) => screens.overviewPage(c, s)),
      routes: [
        GoRoute(
          path: 'tenants',
          builder: (context, state) => page(context, (c, s) => screens.tenantsPage(c, s)),
        ),
        GoRoute(
          path: 'tenants/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            return page(context, (c, s) => screens.tenantDetailPage(c, s, id));
          },
        ),
        GoRoute(
          path: 'sagas',
          builder: (context, state) => page(context, (c, s) => screens.sagasPage(c, s)),
        ),
        GoRoute(
          path: 'sagas/:id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            return page(context, (c, s) => screens.sagaDetailPage(c, s, id));
          },
        ),
        GoRoute(
          path: 'dlq',
          builder: (context, state) => page(context, (c, s) => screens.dlqPage(c, s)),
        ),
        GoRoute(
          path: 'dlq/:queue',
          builder: (context, state) {
            final queue = state.pathParameters['queue'] ?? '';
            return page(context, (c, s) => screens.dlqPage(c, s, queue: queue));
          },
        ),
      ],
    ),
  ];
}
