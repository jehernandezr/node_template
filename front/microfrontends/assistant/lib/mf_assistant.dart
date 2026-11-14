/// Microfrontend `assistant`: manifest consumed by the web and mobile shells.
library;

import 'package:shell_core/shell_core.dart';

import 'src/screens/assistant_screens.dart' deferred as screens;

/// Manifest registered by the shells. Routes live under `/assistant`.
///
/// This file imports nothing from `data/`, `screens/` or `l10n/` except
/// through the deferred import, so the shell bundle stays small.
final MicrofrontendManifest assistantManifest = MicrofrontendManifest(
  id: MicrofrontendId.assistant,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.planFeature(PlanFeature.aiAssistant),
  menu: const [
    MenuEntry(labelKey: 'menuAssistant', path: '/assistant', order: 40),
  ],
  screens: [
    ScreenRoute(
      path: '/assistant',
      loadLibrary: screens.loadLibrary,
      builder: (scope, {params = const {}}) =>
          screens.buildAssistantListScreen(scope),
      routes: [
        ScreenRoute(
          path: ':conversationId',
          loadLibrary: screens.loadLibrary,
          builder: (scope, {params = const {}}) => screens
              .buildConversationScreen(scope, params['conversationId'] ?? ''),
        ),
      ],
    ),
  ],
);
