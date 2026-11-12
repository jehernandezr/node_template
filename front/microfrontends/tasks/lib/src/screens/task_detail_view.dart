import 'dart:async';

import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/task.dart';
import '../data/tasks_repository.dart';
import '../l10n/generated/tasks_localizations.dart';
import 'task_status_label.dart';

/// Detail of one task with edit and delete actions.
///
/// Used as a route body and as the side pane of the list on wide screens.
/// Reloads when the repository changes. [onDeleted] runs after a delete.
class TaskDetailView extends StatefulWidget {
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
  State<TaskDetailView> createState() => _TaskDetailViewState();
}

class _TaskDetailViewState extends State<TaskDetailView> {
  late Future<Task> _task = widget.repository.get(widget.taskId);
  StreamSubscription<void>? _changes;

  /// Set while this view deletes its task, so the delete's change event does
  /// not reload a task that no longer exists.
  bool _deleting = false;

  @override
  void initState() {
    super.initState();
    _changes = widget.repository.changes().listen((_) {
      if (!_deleting) _reload();
    });
  }

  @override
  void didUpdateWidget(covariant TaskDetailView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.taskId != widget.taskId) _reload();
  }

  @override
  void dispose() {
    _changes?.cancel();
    super.dispose();
  }

  void _reload() {
    if (!mounted) return;
    final task = widget.repository.get(widget.taskId);
    setState(() {
      _task = task;
    });
  }

  Future<void> _confirmDelete(Task task) async {
    final l10n = TasksLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
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
      ),
    );
    if (confirmed != true || !mounted) return;
    _deleting = true;
    try {
      await widget.repository.delete(task.id);
    } catch (_) {
      _deleting = false;
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(l10n.deleteError)));
      return;
    }
    if (!mounted) return;
    widget.onDeleted();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    return FutureBuilder<Task>(
      future: _task,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          final error = snapshot.error!;
          if (error is TaskNotFoundException) {
            return ErrorView(message: l10n.detailNotFound);
          }
          return ErrorView.fromException(
            error,
            fallbackMessage: l10n.detailError,
            codeLabel: AppLocalizations.of(context).errorCodeLabel,
            traceIdLabel: AppLocalizations.of(context).errorTraceIdLabel,
            retryLabel: AppLocalizations.of(context).actionRetry,
            onRetry: _reload,
          );
        }
        if (!snapshot.hasData) return const LoadingView();
        final task = snapshot.data!;
        return ListView(
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
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: [
                AppButton(
                  label: shared.edit,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => context.go('/tasks/${task.id}/edit'),
                ),
                AppButton(
                  label: shared.delete,
                  variant: AppButtonVariant.danger,
                  onPressed: () => _confirmDelete(task),
                ),
              ],
            ),
          ],
        );
      },
    );
  }
}
