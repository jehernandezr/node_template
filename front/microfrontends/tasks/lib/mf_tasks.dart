/// Microfrontend `tasks`: manifest consumed by the web and mobile shells.
///
/// This file imports nothing from `data/`, `screens/` or `l10n/` except
/// through the deferred import, so those load on demand.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/tasks_access.dart';
import 'src/shared/constants/tasks_paths.dart';

/// Shown while a screen's library loads.
const Widget _loading = Center(child: CircularProgressIndicator());

/// Manifest registered by the shells. Routes live under `/tasks`.
///
/// Data is not created here: the deferred builders get it from the scope of
/// the current identity, so each user starts with a fresh repository.
///
/// Demo only: tasks has no contract yet.
final MicrofrontendManifest tasksManifest = MicrofrontendManifest(
  id: tasksId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: tasksReadRule,
  modes: const {ShellMode.demo},
  menu: const [
    MenuEntry(
      label: tasksMenuLabel,
      path: TasksPaths.list,
      order: 20,
      icon: Icons.check_circle_outline,
      selectedIcon: Icons.check_circle,
    ),
  ],
  deepLinks: _deepLink,
  screens: [
    ScreenRoute(
      path: TasksPaths.list,
      loadLibrary: screens.loadLibrary,
      loading: _loading,
      builder: (scope, {params = const {}}) =>
          screens.buildTasksListScreen(scope),
      routes: [
        // Declared before `:id` so `new` is not read as an id.
        ScreenRoute(
          path: TasksPaths.newSegment,
          access: tasksWriteRule,
          loadLibrary: screens.loadLibrary,
          loading: _loading,
          builder: (scope, {params = const {}}) =>
              screens.buildTaskFormScreen(scope),
        ),
        ScreenRoute(
          path: ':${TasksPaths.idParam}',
          loadLibrary: screens.loadLibrary,
          loading: _loading,
          builder: (scope, {params = const {}}) =>
              screens.buildTaskDetailScreen(
                scope,
                taskId: params[TasksPaths.idParam]!,
              ),
          routes: [
            ScreenRoute(
              path: TasksPaths.editSegment,
              access: tasksWriteRule,
              loadLibrary: screens.loadLibrary,
              loading: _loading,
              builder: (scope, {params = const {}}) =>
                  screens.buildTaskFormScreen(
                    scope,
                    taskId: params[TasksPaths.idParam],
                  ),
            ),
          ],
        ),
      ],
    ),
  ],
);

final RegExp _taskId = RegExp(r'^[A-Za-z0-9_-]{1,128}$');

/// `tasks/<id>` opens the detail of that task. The id is a plain token and
/// never a page segment such as `new`, so a link cannot open a form.
String? _deepLink(List<String> rest, Map<String, String> query) {
  if (rest.length != 1) return null;
  final id = rest.single;
  if (TasksPaths.reservedSegments.contains(id) || !_taskId.hasMatch(id)) {
    return null;
  }
  return TasksPaths.detail(id);
}
