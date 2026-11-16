/// Microfrontend `verifier`: manifest consumed by the mobile shell.
///
/// This file reaches `src/data`, `src/screens` and `src/l10n` only through the
/// deferred import below.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/verifier_constants.dart';

/// Manifest registered by the shells. Routes live under `/verifier`.
///
/// It is not public: the verifier approves login attempts of the signed-in
/// user, so it needs a session. The repository is created by the deferred
/// screen from the identity's scope, so each user and tenant has its own.
/// Demo only: login challenges have no contract yet.
final MicrofrontendManifest verifierManifest = MicrofrontendManifest(
  id: verifierId,
  platforms: {AppPlatform.mobile},
  access: AccessRule.authenticated(),
  modes: const {ShellMode.demo},
  menu: const [
    MenuEntry(
      label: verifierMenuLabel,
      path: verifierPath,
      order: 60,
      icon: Icons.verified_user_outlined,
      selectedIcon: Icons.verified_user,
    ),
  ],
  deepLinks: _deepLink,
  screens: [
    ScreenRoute.deferred(
      verifierPath,
      library: screens.loadLibrary,
      build: (scope, params) => screens.VerifierScreens.main(scope),
    ),
  ],
);

final RegExp _challengeId = RegExp(r'^[A-Za-z0-9_-]{1,128}$');

/// `verifier?challenge=<id>` opens the verifier on that challenge. The id is
/// a plain token, so a link cannot smuggle a path.
String? _deepLink(List<String> rest, Map<String, String> query) {
  final challenge = query[verifierChallengeParam];
  if (rest.isNotEmpty || challenge == null) return null;
  if (!_challengeId.hasMatch(challenge)) return null;
  return Uri(
    path: verifierPath,
    queryParameters: {verifierChallengeParam: challenge},
  ).toString();
}
