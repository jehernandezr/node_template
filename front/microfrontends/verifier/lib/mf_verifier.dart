/// Microfrontend `verifier`: manifest consumed by the web and mobile shells.
library;

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/verifier_screen.dart' deferred as screens;

/// Manifest registered by the shells. Routes live under `/verifier`.
///
/// The repository is not created here: the deferred screen gets it from the
/// identity's scope when it builds, so each user and tenant has its own.
final MicrofrontendManifest verifierManifest = MicrofrontendManifest(
  id: MicrofrontendId.verifier,
  platforms: {AppPlatform.mobile},
  access: AccessRule.authenticated(),
  menu: const [
    MenuEntry(labelKey: 'menuVerifier', path: '/verifier', order: 60),
  ],
  routes: (load, scope) => [
    GoRoute(
      path: '/verifier',
      builder: (context, state) => load(
        loadLibrary: screens.loadLibrary,
        builder: () => Localizations.override(
          context: context,
          delegates: [screens.VerifierLocalizations.delegate],
          child: screens.buildVerifierScreen(scope()),
        ),
        loading: const Center(child: CircularProgressIndicator()),
      ),
    ),
  ],
);
