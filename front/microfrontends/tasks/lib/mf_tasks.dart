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

/// Manifest registered by the shells. Routes live under `/tasks`.
///
/// Data is not created here: the deferred screens get it from the scope of
/// the current identity, so each user starts with a fresh repository.
///
/// It serves demo and live shells: in live mode the data comes from the tasks
/// API.
///
/// Declared before `:id` so `new` is not read as an id.
final MicrofrontendManifest tasksManifest = MicrofrontendManifest(
  id: tasksId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: tasksReadRule,
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
    ScreenRoute.deferred(
      TasksPaths.list,
      library: screens.loadLibrary,
      build: (scope, params) => screens.TasksScreens.list(scope),
      routes: [
        ScreenRoute.deferred(
          TasksPaths.newSegment,
          access: tasksWriteRule,
          library: screens.loadLibrary,
          build: (scope, params) => screens.TasksScreens.form(scope),
        ),
        ScreenRoute.deferred(
          ':${TasksPaths.idParam}',
          library: screens.loadLibrary,
          build: (scope, params) => screens.TasksScreens.detail(
            scope,
            taskId: params.require(TasksPaths.idParam),
          ),
          routes: [
            ScreenRoute.deferred(
              TasksPaths.editSegment,
              access: tasksWriteRule,
              library: screens.loadLibrary,
              build: (scope, params) => screens.TasksScreens.form(
                scope,
                taskId: params.require(TasksPaths.idParam),
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
