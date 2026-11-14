/// Microfrontend `account`: manifest consumed by the web and mobile shells.
///
/// This file imports only the shell contracts and the shared constants. The
/// screens, repositories and texts live behind `deferred`.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/account_constants.dart';
import 'src/shared/enums/account_enums.dart';
import 'src/shared/constants/account_access.dart';

/// Manifest registered by the shells. Routes live under `/account`.
///
/// Security needs a recent second factor: the shell sends a session without
/// one to its step-up page first. It serves demo and live shells: in live
/// mode only what the identity contract covers is offered.
final MicrofrontendManifest accountManifest = MicrofrontendManifest(
  id: accountId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.authenticated(),
  menu: const [
    MenuEntry(
      label: accountMenuLabel,
      path: accountBasePath,
      order: 10,
      icon: Icons.person_outline,
      selectedIcon: Icons.person,
    ),
  ],
  screens: [
    ScreenRoute(
      path: accountBasePath,
      loadLibrary: screens.loadLibrary,
      builder: (scope, {params = const {}}) =>
          screens.buildAccountOverviewScreen(scope),
      routes: [
        ScreenRoute(
          path: AccountSection.sessions.segment,
          loadLibrary: screens.loadLibrary,
          builder: (scope, {params = const {}}) =>
              screens.buildAccountSessionsScreen(scope),
        ),
        ScreenRoute(
          path: AccountSection.devices.segment,
          loadLibrary: screens.loadLibrary,
          builder: (scope, {params = const {}}) =>
              screens.buildAccountDevicesScreen(scope),
        ),
        ScreenRoute(
          path: AccountSection.security.segment,
          loadLibrary: screens.loadLibrary,
          access: accountStepUpRule,
          builder: (scope, {params = const {}}) =>
              screens.buildAccountSecurityScreen(scope),
        ),
        ScreenRoute(
          path: AccountSection.agreements.segment,
          loadLibrary: screens.loadLibrary,
          builder: (scope, {params = const {}}) =>
              screens.buildAccountAgreementsScreen(scope),
        ),
      ],
    ),
  ],
);
