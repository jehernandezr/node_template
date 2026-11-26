import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../data/tasks_repository.dart';
import '../l10n/generated/tasks_localizations.dart';
import '../shared/constants/tasks_access.dart';
import '../shared/constants/tasks_paths.dart';
import '../shared/enums/task_status.dart';
import '../shared/types/task.dart';
import 'task_detail_view.dart';
import 'task_status_label.dart';
import 'tasks_list_controller.dart';

/// Route `/tasks`: tasks with status filter, search and cursor pagination.
///
/// Compact widths open a task's route; wide widths show the selected task
/// beside the list. The list state lives in a [TasksListController]; this
/// screen draws it and forwards the input.
class TasksListScreen extends StatelessWidget {
  /// Creates the list backed by [repository].
  const TasksListScreen({super.key, required this.repository});

  /// Source of the tasks.
  final TasksRepository repository;

  /// The repository is part of the key: a new identity gets a new controller.
  @override
  Widget build(BuildContext context) => ControllerBuilder<TasksListController>(
    key: ObjectKey(repository),
    create: (_) => TasksListController(repository)..start(),
    builder: (context, controller) => AppPage(
      title: TasksLocalizations.of(context).screenTitle,
      floatingActionButton: AccessGate(
        rule: tasksWriteRule,
        child: FloatingActionButton.extended(
          onPressed: () => context.go(TasksPaths.create),
          icon: const Icon(Icons.add),
          label: Text(TasksLocalizations.of(context).newTask),
        ),
      ),
      body: PlatformScreen(
        compact: (context) => _TasksListPane(
          controller: controller,
          onOpen: (task) => context.go(TasksPaths.detail(task.id)),
        ),
        expanded: (context) => Row(
          children: [
            SizedBox(
              width: AppLayout.listPaneWidth,
              child: _TasksListPane(
                controller: controller,
                onOpen: (task) => controller.select(task.id),
              ),
            ),
            const VerticalDivider(width: 1),
            Expanded(
              child: _DetailPane(
                repository: repository,
                controller: controller,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// The selected task beside the list, or a hint to pick one.
class _DetailPane extends StatelessWidget {
  const _DetailPane({required this.repository, required this.controller});

  final TasksRepository repository;
  final TasksListController controller;

  @override
  Widget build(BuildContext context) {
    final selected = controller.selectedId;
    if (selected == null) {
      return EmptyState(
        icon: Icons.task_alt,
        title: TasksLocalizations.of(context).selectTask,
      );
    }
    return TaskDetailView(
      key: ValueKey(selected),
      repository: repository,
      taskId: selected,
      onDeleted: () => controller.select(null),
    );
  }
}

/// Search field, status filters and the tasks. [onOpen] decides what a tap
/// on a task does for the current width.
class _TasksListPane extends StatelessWidget {
  const _TasksListPane({required this.controller, required this.onOpen});

  final TasksListController controller;
  final ValueChanged<Task> onOpen;

  /// A width change rebuilds this field from scratch: starting from the current query brings back what the user searched for.
  @override
  Widget build(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.only(
            start: AppSpacing.md,
            end: AppSpacing.md,
            top: AppSpacing.sm,
          ),
          child: TextFormField(
            initialValue: controller.query,
            onChanged: controller.search,
            decoration: InputDecoration(
              hintText: l10n.searchHint,
              prefixIcon: const Icon(Icons.search),
              border: const OutlineInputBorder(),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsetsDirectional.only(
            start: AppSpacing.md,
            end: AppSpacing.md,
            top: AppSpacing.sm,
            bottom: AppSpacing.sm,
          ),
          child: Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              for (final (status, label) in _statusFilters(l10n))
                ChoiceChip(
                  label: Text(label),
                  selected: controller.status == status,
                  onSelected: (_) => controller.filter(status),
                ),
            ],
          ),
        ),
        Expanded(
          child: AsyncValueView<List<Task>>(
            value: controller.items,
            errorMessage: l10n.loadError,
            onRetry: controller.reload,
            data: (items) => _TaskItems(
              controller: controller,
              items: items,
              onOpen: onOpen,
            ),
          ),
        ),
      ],
    );
  }

  static List<(TaskStatus?, String)> _statusFilters(TasksLocalizations l10n) =>
      [
        (null, l10n.filterAll),
        (TaskStatus.open, l10n.filterOpen),
        (TaskStatus.inProgress, l10n.filterInProgress),
        (TaskStatus.done, l10n.filterDone),
      ];
}

/// The loaded tasks, with "load more" at the end while there are more pages,
/// or the empty state of the list or of the search.
class _TaskItems extends StatelessWidget {
  const _TaskItems({
    required this.controller,
    required this.items,
    required this.onOpen,
  });

  final TasksListController controller;
  final List<Task> items;
  final ValueChanged<Task> onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    if (items.isEmpty) {
      return controller.searching
          ? EmptyState(
              icon: Icons.search_off,
              title: l10n.emptySearchTitle,
              message: l10n.emptySearchMessage,
            )
          : EmptyState(
              icon: Icons.checklist,
              title: l10n.emptyTitle,
              message: l10n.emptyMessage,
            );
    }
    final hasMore = controller.hasMore;
    return ListView.separated(
      itemCount: items.length + (hasMore ? 1 : 0),
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        if (index == items.length) return _LoadMore(controller: controller);
        final task = items[index];
        return ListTile(
          key: ValueKey(task.id),
          selected: task.id == controller.selectedId,
          title: Text(task.title),
          subtitle: Text(taskStatusLabel(l10n, task.status)),
          onTap: () => onOpen(task),
        );
      },
    );
  }
}

/// Button that appends the next page, or a spinner while it loads.
class _LoadMore extends StatelessWidget {
  const _LoadMore({required this.controller});

  final TasksListController controller;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(AppSpacing.md),
    child: Center(
      child: controller.loadingMore
          ? const CircularProgressIndicator()
          : OutlinedButton(
              onPressed: () => _loadMore(context),
              child: Text(AppLocalizations.of(context).loadMore),
            ),
    ),
  );

  Future<void> _loadMore(BuildContext context) async {
    final result = await controller.loadMore();
    if (!context.mounted) return;
    showActionResult(
      context,
      result,
      failure: TasksLocalizations.of(context).loadError,
    );
  }
}
