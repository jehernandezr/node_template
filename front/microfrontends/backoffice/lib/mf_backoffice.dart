/// Microfrontend `backoffice`: manifest consumed by the web shell.
///
/// This file is eager. It imports only `shell_core`, the access rules of
/// `src/shared/constants` and, deferred, the screens library. Data, screens
/// and localizations (`src/{data,screens,l10n}`) are reachable only through
/// that library, so customers never download them.
library;

import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/backoffice_access.dart';
import 'src/shared/constants/backoffice_paths.dart';

/// Manifest registered by the shells. Routes live under `/backoffice`.
///
/// Any platform role enters with a recent second factor; without one the shell
/// sends the user to its step-up page. Sagas and dead-letter queues are not
/// for `finance`; their actions are only for `superAdmin` and `support`.
final MicrofrontendManifest backofficeManifest = MicrofrontendManifest(
  id: MicrofrontendId.backoffice,
  platforms: {AppPlatform.web},
  access: backofficeAccess,
  menu: const [
    MenuEntry(
      labelKey: 'menuBackoffice',
      path: BackofficePaths.root,
      order: 90,
    ),
  ],
  screens: [
    ScreenRoute(
      path: BackofficePaths.root,
      loadLibrary: screens.loadLibrary,
      builder: (scope, {params = const {}}) => screens.overviewPage(scope),
      routes: [
        ScreenRoute(
          path: 'tenants',
          loadLibrary: screens.loadLibrary,
          builder: (scope, {params = const {}}) => screens.tenantsPage(scope),
          routes: [
            ScreenRoute(
              path: ':id',
              loadLibrary: screens.loadLibrary,
              builder: (scope, {params = const {}}) =>
                  screens.tenantDetailPage(scope, params['id'] ?? ''),
            ),
          ],
        ),
        ScreenRoute(
          path: 'sagas',
          access: backofficeOperationsReadAccess,
          loadLibrary: screens.loadLibrary,
          builder: (scope, {params = const {}}) => screens.sagasPage(scope),
          routes: [
            ScreenRoute(
              path: ':id',
              loadLibrary: screens.loadLibrary,
              builder: (scope, {params = const {}}) =>
                  screens.sagaDetailPage(scope, params['id'] ?? ''),
            ),
          ],
        ),
        ScreenRoute(
          path: 'dlq',
          access: backofficeOperationsReadAccess,
          loadLibrary: screens.loadLibrary,
          builder: (scope, {params = const {}}) => screens.dlqPage(scope),
          routes: [
            ScreenRoute(
              path: ':queue',
              loadLibrary: screens.loadLibrary,
              builder: (scope, {params = const {}}) =>
                  screens.dlqPage(scope, queue: params['queue']),
            ),
          ],
        ),
      ],
    ),
  ],
);
