/// Entry points of the deferred screens library. The manifest calls them once
/// the library has loaded, with the scope of the current identity.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/fake_tasks_repository.dart';
import '../data/tasks_repository.dart';
import '../l10n/generated/tasks_localizations.dart';
import 'task_detail_screen.dart';
import 'task_form_screen.dart';
import 'tasks_list_screen.dart';

/// The repository of the identity in [scope]. Created on first use, when the
/// builder runs, so it belongs to the scope that was current then.
TasksRepository _repository(MicrofrontendScope scope) =>
    scope.get<TasksRepository>(
      (services) => FakeTasksRepository(),
      dispose: (repository) => repository.close(),
    );

/// Wraps [build] so its strings load with this library, not the shell bundle.
Widget _localized(Widget Function() build) => Builder(
  builder: (context) => Localizations.override(
    context: context,
    delegates: const [TasksLocalizations.delegate],
    child: build(),
  ),
);

/// Route `/tasks`.
Widget buildTasksListScreen(MicrofrontendScope scope) {
  final repository = _repository(scope);
  return _localized(() => TasksListScreen(repository: repository));
}

/// Route `/tasks/:id`.
Widget buildTaskDetailScreen(
  MicrofrontendScope scope, {
  required String taskId,
}) {
  final repository = _repository(scope);
  return _localized(
    () => TaskDetailScreen(repository: repository, taskId: taskId),
  );
}

/// Routes `/tasks/new` (null [taskId]) and `/tasks/:id/edit`.
Widget buildTaskFormScreen(MicrofrontendScope scope, {String? taskId}) {
  final repository = _repository(scope);
  return _localized(
    () => TaskFormScreen(repository: repository, taskId: taskId),
  );
}
