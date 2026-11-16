/// Microfrontend `backoffice`: manifest consumed by the web shell.
///
/// This file is eager. It imports only `shell_core`, the access rules of
/// `src/shared/constants` and, deferred, the screens library. Data, screens
/// and localizations (`src/{data,screens,l10n}`) are reachable only through
/// that library, so customers never download them.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/backoffice_access.dart';
import 'src/shared/constants/backoffice_paths.dart';

/// Manifest registered by the shells. Routes live under `/backoffice`.
///
/// Any platform role enters with a recent second factor; without one the shell
/// sends the user to its step-up page. Sagas and dead-letter queues are not
/// for `finance`; their actions are only for `superAdmin` and `support`.
/// Demo only: the backoffice API has no contract yet.
final MicrofrontendManifest backofficeManifest = MicrofrontendManifest(
  id: backofficeId,
  platforms: {AppPlatform.web},
  access: backofficeAccess,
  modes: const {ShellMode.demo},
  menu: const [
    MenuEntry(
      label: backofficeMenuLabel,
      path: BackofficePaths.root,
      order: 90,
      icon: Icons.admin_panel_settings_outlined,
      selectedIcon: Icons.admin_panel_settings,
    ),
  ],
  screens: [
    ScreenRoute.deferred(
      BackofficePaths.root,
      library: screens.loadLibrary,
      build: (scope, params) => screens.BackofficeScreens.overview(scope),
      routes: [
        ScreenRoute.deferred(
          BackofficePaths.tenantsSegment,
          library: screens.loadLibrary,
          build: (scope, params) => screens.BackofficeScreens.tenants(scope),
          routes: [
            ScreenRoute.deferred(
              ':${BackofficePaths.idParam}',
              library: screens.loadLibrary,
              build: (scope, params) => screens.BackofficeScreens.tenantDetail(
                scope,
                params.require(BackofficePaths.idParam),
              ),
            ),
          ],
        ),
        ScreenRoute.deferred(
          BackofficePaths.sagasSegment,
          access: backofficeOperationsReadAccess,
          library: screens.loadLibrary,
          build: (scope, params) => screens.BackofficeScreens.sagas(scope),
          routes: [
            ScreenRoute.deferred(
              ':${BackofficePaths.idParam}',
              library: screens.loadLibrary,
              build: (scope, params) => screens.BackofficeScreens.sagaDetail(
                scope,
                params.require(BackofficePaths.idParam),
              ),
            ),
          ],
        ),
        ScreenRoute.deferred(
          BackofficePaths.dlqSegment,
          access: backofficeOperationsReadAccess,
          library: screens.loadLibrary,
          build: (scope, params) => screens.BackofficeScreens.dlq(scope),
          routes: [
            ScreenRoute.deferred(
              ':${BackofficePaths.queueParam}',
              library: screens.loadLibrary,
              build: (scope, params) => screens.BackofficeScreens.dlq(
                scope,
                queue: params[BackofficePaths.queueParam],
              ),
            ),
          ],
        ),
      ],
    ),
  ],
);
