/// Microfrontend `account`: manifest consumed by the web and mobile shells.
///
/// This file imports only the shell contracts and the shared constants. The
/// screens, repositories and texts live behind `deferred`.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/account_access.dart';
import 'src/shared/constants/account_constants.dart';
import 'src/shared/enums/account_enums.dart';

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
    ScreenRoute.deferred(
      accountBasePath,
      library: screens.loadLibrary,
      build: (scope, params) => screens.AccountScreens.overview(scope),
      routes: [
        ScreenRoute.deferred(
          AccountSection.sessions.segment,
          library: screens.loadLibrary,
          build: (scope, params) => screens.AccountScreens.sessions(scope),
        ),
        ScreenRoute.deferred(
          AccountSection.devices.segment,
          library: screens.loadLibrary,
          build: (scope, params) => screens.AccountScreens.devices(scope),
        ),
        ScreenRoute.deferred(
          AccountSection.security.segment,
          library: screens.loadLibrary,
          access: accountStepUpRule,
          build: (scope, params) => screens.AccountScreens.security(scope),
        ),
        ScreenRoute.deferred(
          AccountSection.agreements.segment,
          library: screens.loadLibrary,
          build: (scope, params) => screens.AccountScreens.agreements(scope),
        ),
      ],
    ),
  ],
);
