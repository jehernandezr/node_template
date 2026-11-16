import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/tasks_repository.dart';
import '../l10n/generated/tasks_localizations.dart';
import '../shared/constants/tasks_paths.dart';
import '../shared/types/task.dart';
import 'task_form_controller.dart';
import 'task_form_state.dart';
import 'widgets/task_form_fields.dart';

/// Route `/tasks/new` (create) and `/tasks/:id/edit` (edit).
///
/// Saving calls the repository and navigates with `go`: to the list after a
/// create, to the task's page after an edit. A failed save shows a snack bar
/// and keeps the form; one that breaks the contract also shows its field
/// errors under the fields.
class TaskFormScreen extends StatelessWidget {
  /// Creates the form. A null [taskId] creates a new task.
  const TaskFormScreen({super.key, required this.repository, this.taskId});

  final TasksRepository repository;
  final String? taskId;

  @override
  Widget build(BuildContext context) => ControllerBuilder<TaskFormController>(
    // The repository is part of the key: a new identity gets a new controller.
    key: ValueKey((repository, taskId)),
    create: (_) => TaskFormController(repository, taskId: taskId)..start(),
    builder: (context, controller) {
      final l10n = TasksLocalizations.of(context);
      final id = taskId;
      Future<void> submit(TaskDraft draft) async {
        final result = await controller.save(draft);
        if (!context.mounted) return;
        showActionResult(
          context,
          result,
          failure: TasksLocalizations.of(context).saveError,
        );
        if (controller.state is TaskFormSaved) {
          context.go(id == null ? TasksPaths.list : TasksPaths.detail(id));
        }
      }

      return AppPage(
        title: id == null ? l10n.newTask : l10n.editTaskTitle,
        onBack: () =>
            context.go(id == null ? TasksPaths.list : TasksPaths.detail(id)),
        body: switch (controller.state) {
          TaskFormLoading() => const LoadingView(),
          TaskFormLoadFailed(:final error) => ErrorView.fromException(
            error,
            fallbackMessage: error is TaskNotFoundException
                ? l10n.detailNotFound
                : l10n.detailError,
            onRetry: error is TaskNotFoundException ? null : controller.start,
          ),
          // The same widget at the same place for the three states, so the
          // text typed before a save survives it.
          TaskFormEditing(:final task, :final fieldErrors) => TaskFormFields(
            key: const ValueKey('task-form-fields'),
            task: task,
            fieldErrors: fieldErrors,
            saving: false,
            onSubmit: submit,
          ),
          TaskFormSaving() || TaskFormSaved() => TaskFormFields(
            key: const ValueKey('task-form-fields'),
            task: null,
            fieldErrors: const {},
            saving: true,
            onSubmit: submit,
          ),
        },
      );
    },
  );
}
