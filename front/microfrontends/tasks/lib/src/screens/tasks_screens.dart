/// Entry points of the tasks screens, used by the manifest.
///
/// This file is imported as `deferred`, so the repository, the sample data
/// and the tasks texts travel with the screens.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/tasks_data.dart';
import '../data/tasks_repository.dart';
import '../l10n/generated/tasks_localizations.dart';
import 'task_detail_screen.dart';
import 'task_form_screen.dart';
import 'tasks_list_screen.dart';

/// Builds each tasks screen for a [MicrofrontendScope]. The repository is the
/// scope's, so every identity has its own and releases it on close.
abstract final class TasksScreens {
  /// Route `/tasks`.
  static Widget list(MicrofrontendScope scope) =>
      _withTasksTexts(TasksListScreen(repository: _repository(scope)));

  /// Route `/tasks/:id`.
  static Widget detail(MicrofrontendScope scope, {required String taskId}) =>
      _withTasksTexts(
        TaskDetailScreen(repository: _repository(scope), taskId: taskId),
      );

  /// Routes `/tasks/new` (null [taskId]) and `/tasks/:id/edit`.
  static Widget form(MicrofrontendScope scope, {String? taskId}) =>
      _withTasksTexts(
        TaskFormScreen(repository: _repository(scope), taskId: taskId),
      );

  static TasksRepository _repository(MicrofrontendScope scope) =>
      scope.repository(TasksData.repository);

  /// The delegates load with the deferred screens, not with the shell.
  static Widget _withTasksTexts(Widget child) => DeferredLocalizations(
    delegates: const [TasksLocalizations.delegate],
    child: child,
  );
}
