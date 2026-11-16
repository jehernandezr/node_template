import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../data/tasks_repository.dart';
import '../l10n/generated/tasks_localizations.dart';
import '../shared/constants/tasks_access.dart';
import '../shared/constants/tasks_paths.dart';
import '../shared/types/task.dart';
import 'task_detail_controller.dart';
import 'task_detail_state.dart';
import 'task_status_label.dart';

/// Detail of one task with edit and delete actions.
///
/// Used as a route body and as the side pane of the list on wide screens.
/// Reloads when the repository changes. [onDeleted] runs after a delete.
class TaskDetailView extends StatelessWidget {
  /// Creates the detail of the task [taskId].
  const TaskDetailView({
    super.key,
    required this.repository,
    required this.taskId,
    required this.onDeleted,
  });

  final TasksRepository repository;
  final String taskId;
  final VoidCallback onDeleted;

  @override
  Widget build(BuildContext context) => ControllerBuilder<TaskDetailController>(
    // The repository is part of the key: a new identity gets a new controller.
    key: ValueKey((repository, taskId)),
    create: (_) => TaskDetailController(repository, taskId: taskId)..start(),
    builder: (context, controller) => switch (controller.state) {
      TaskDetailShowing(:final task) => _TaskDetailBody(
        controller: controller,
        task: task,
        onDeleted: onDeleted,
      ),
      TaskDetailDeleting() || TaskDetailDeleted() => const LoadingView(),
    },
  );
}

/// The task with its actions, or the load error.
class _TaskDetailBody extends StatelessWidget {
  const _TaskDetailBody({
    required this.controller,
    required this.task,
    required this.onDeleted,
  });

  final TaskDetailController controller;
  final AsyncValue<Task> task;
  final VoidCallback onDeleted;

  @override
  Widget build(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final notFound = switch (task) {
      AsyncError<Task>(:final error) => error is TaskNotFoundException,
      _ => false,
    };
    return AsyncValueView<Task>(
      value: task,
      errorMessage: notFound ? l10n.detailNotFound : l10n.detailError,
      onRetry: notFound ? null : controller.start,
      data: (task) => ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text(task.title, style: textTheme.headlineSmall),
          const SizedBox(height: AppSpacing.sm),
          Chip(label: Text(taskStatusLabel(l10n, task.status))),
          const SizedBox(height: AppSpacing.md),
          Text(
            task.description.isEmpty ? l10n.noDescription : task.description,
            style: textTheme.bodyLarge,
          ),
          const SizedBox(height: AppSpacing.lg),
          AccessGate(
            rule: tasksWriteRule,
            child: Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                AppButton(
                  label: shared.edit,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => context.go(TasksPaths.edit(task.id)),
                ),
                AppButton(
                  label: shared.delete,
                  variant: AppButtonVariant.danger,
                  onPressed: () => _confirmDelete(context),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context) async {
    final confirmed = await context.showLocalizedDialog<bool>(
      builder: (dialogContext) {
        final l10n = TasksLocalizations.of(dialogContext);
        final shared = AppLocalizations.of(dialogContext);
        return AlertDialog(
          title: Text(l10n.deleteTitle),
          content: Text(l10n.deleteMessage),
          actions: [
            AppButton(
              label: shared.actionCancel,
              variant: AppButtonVariant.secondary,
              onPressed: () => Navigator.of(dialogContext).pop(false),
            ),
            AppButton(
              label: shared.delete,
              variant: AppButtonVariant.danger,
              onPressed: () => Navigator.of(dialogContext).pop(true),
            ),
          ],
        );
      },
    );
    if (confirmed != true || !context.mounted) return;
    final result = await controller.delete();
    if (!context.mounted) return;
    showActionResult(
      context,
      result,
      failure: TasksLocalizations.of(context).deleteError,
    );
    if (result is ActionSucceeded<void>) onDeleted();
  }
}
