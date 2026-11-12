/// Microfrontend `tasks`: manifest consumed by the web and mobile shells.
library;

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;

/// Shown while a screen's library loads.
const Widget _loading = Center(child: CircularProgressIndicator());

/// Manifest registered by the shells. Routes live under `/tasks`.
///
/// Data is not created here: the deferred builders get it from the scope of
/// the current identity, so each user starts with a fresh repository.
final MicrofrontendManifest tasksManifest = MicrofrontendManifest(
  id: MicrofrontendId.tasks,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.permissions([Permission.tasksRead]),
  menu: const [MenuEntry(labelKey: 'menuTasks', path: '/tasks', order: 20)],
  // TODO(WP0): API anterior al contrato de ADR 0018; migrar y quitar el ignore.
  // ignore: deprecated_member_use
  routes: (load, scope) => [
    GoRoute(
      path: '/tasks',
      builder: (context, state) => load(
        loadLibrary: screens.loadLibrary,
        builder: () => screens.buildTasksListScreen(scope()),
        loading: _loading,
      ),
      routes: [
        // Declared before `:id` so `new` is not read as an id.
        GoRoute(
          path: 'new',
          builder: (context, state) => load(
            loadLibrary: screens.loadLibrary,
            builder: () => screens.buildTaskFormScreen(scope()),
            loading: _loading,
          ),
        ),
        GoRoute(
          path: ':id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return load(
              loadLibrary: screens.loadLibrary,
              builder: () => screens.buildTaskDetailScreen(scope(), taskId: id),
              loading: _loading,
            );
          },
          routes: [
            GoRoute(
              path: 'edit',
              builder: (context, state) {
                final id = state.pathParameters['id']!;
                return load(
                  loadLibrary: screens.loadLibrary,
                  builder: () =>
                      screens.buildTaskFormScreen(scope(), taskId: id),
                  loading: _loading,
                );
              },
            ),
          ],
        ),
      ],
    ),
  ],
);
