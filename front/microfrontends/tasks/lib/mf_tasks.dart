/// Microfrontend `tasks`: manifest consumed by the web and mobile shells.
///
/// This file imports nothing from `data/`, `screens/` or `l10n/` except
/// through the deferred import, so those load on demand.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/tasks_access.dart';

/// Shown while a screen's library loads.
const Widget _loading = Center(child: CircularProgressIndicator());

/// Manifest registered by the shells. Routes live under `/tasks`.
///
/// Data is not created here: the deferred builders get it from the scope of
/// the current identity, so each user starts with a fresh repository.
final MicrofrontendManifest tasksManifest = MicrofrontendManifest(
  id: MicrofrontendId.tasks,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: tasksReadRule,
  menu: const [MenuEntry(labelKey: 'menuTasks', path: '/tasks', order: 20)],
  screens: [
    ScreenRoute(
      path: '/tasks',
      loadLibrary: screens.loadLibrary,
      loading: _loading,
      builder: (scope, {params = const {}}) =>
          screens.buildTasksListScreen(scope),
      routes: [
        // Declared before `:id` so `new` is not read as an id.
        ScreenRoute(
          path: 'new',
          access: tasksWriteRule,
          loadLibrary: screens.loadLibrary,
          loading: _loading,
          builder: (scope, {params = const {}}) =>
              screens.buildTaskFormScreen(scope),
        ),
        ScreenRoute(
          path: ':id',
          loadLibrary: screens.loadLibrary,
          loading: _loading,
          builder: (scope, {params = const {}}) =>
              screens.buildTaskDetailScreen(scope, taskId: params['id']!),
          routes: [
            ScreenRoute(
              path: 'edit',
              access: tasksWriteRule,
              loadLibrary: screens.loadLibrary,
              loading: _loading,
              builder: (scope, {params = const {}}) =>
                  screens.buildTaskFormScreen(scope, taskId: params['id']),
            ),
          ],
        ),
      ],
    ),
  ],
);
