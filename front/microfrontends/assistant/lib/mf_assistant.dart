/// Microfrontend `assistant`: manifest consumed by the web and mobile shells.
library;

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/presentation/assistant_screens.dart' deferred as screens;

/// Manifest registered by the shells. Routes live under `/assistant`.
final MicrofrontendManifest assistantManifest = MicrofrontendManifest(
  id: MicrofrontendId.assistant,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.planFeature(PlanFeature.aiAssistant),
  menu: const [
    MenuEntry(labelKey: 'menuAssistant', path: '/assistant', order: 40),
  ],
  // TODO(WP0): API anterior al contrato de ADR 0018; migrar y quitar el ignore.
  // ignore: deprecated_member_use
  routes: (load, scope) => [
    GoRoute(
      path: '/assistant',
      builder: (context, state) => load(
        loadLibrary: screens.loadLibrary,
        builder: () => screens.buildAssistantListScreen(scope()),
        loading: const Center(child: CircularProgressIndicator()),
      ),
      routes: [
        GoRoute(
          path: ':conversationId',
          builder: (context, state) {
            final conversationId = state.pathParameters['conversationId']!;
            return load(
              loadLibrary: screens.loadLibrary,
              builder: () =>
                  screens.buildConversationScreen(scope(), conversationId),
              loading: const Center(child: CircularProgressIndicator()),
            );
          },
        ),
      ],
    ),
  ],
);
