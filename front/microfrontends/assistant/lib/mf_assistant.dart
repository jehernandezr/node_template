/// Microfrontend `assistant`: manifest consumed by the web and mobile shells.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/assistant_screens.dart' deferred as screens;
import 'src/shared/constants/assistant_constants.dart';

/// Manifest registered by the shells. Routes live under `/assistant`.
///
/// This file imports nothing from `data/`, `screens/` or `l10n/` except
/// through the deferred import, so the shell bundle stays small. Demo only:
/// the assistant has no contract yet.
final MicrofrontendManifest assistantManifest = MicrofrontendManifest(
  id: assistantId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.planFeature(PlanFeature.aiAssistant),
  modes: const {ShellMode.demo},
  menu: const [
    MenuEntry(
      label: assistantMenuLabel,
      path: assistantBasePath,
      order: 40,
      icon: Icons.smart_toy_outlined,
      selectedIcon: Icons.smart_toy,
    ),
  ],
  screens: [
    ScreenRoute.deferred(
      assistantBasePath,
      library: screens.loadLibrary,
      build: (scope, params) => screens.AssistantScreens.list(scope),
      routes: [
        ScreenRoute.deferred(
          ':$conversationIdParam',
          library: screens.loadLibrary,
          build: (scope, params) => screens.AssistantScreens.conversation(
            scope,
            params[conversationIdParam] ?? '',
          ),
        ),
      ],
    ),
  ],
);
