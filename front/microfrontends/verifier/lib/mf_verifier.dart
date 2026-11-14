/// Microfrontend `verifier`: manifest consumed by the web and mobile shells.
///
/// This file reaches `src/data`, `src/screens` and `src/l10n` only through the
/// deferred import below.
library;

import 'package:shell_core/shell_core.dart';

import 'src/screens/verifier_screen.dart' deferred as screens;

/// Manifest registered by the shells. Routes live under `/verifier`.
///
/// It is not public: the verifier approves login attempts of the signed-in
/// user, so it needs a session. The repository is created by the deferred
/// screen from the identity's scope, so each user and tenant has its own.
final MicrofrontendManifest verifierManifest = MicrofrontendManifest(
  id: MicrofrontendId.verifier,
  platforms: {AppPlatform.mobile},
  access: AccessRule.authenticated(),
  menu: const [
    MenuEntry(labelKey: 'menuVerifier', path: '/verifier', order: 60),
  ],
  screens: [
    ScreenRoute(
      path: '/verifier',
      loadLibrary: screens.loadLibrary,
      builder: (scope, {params = const {}}) =>
          screens.buildVerifierScreen(scope),
    ),
  ],
);
