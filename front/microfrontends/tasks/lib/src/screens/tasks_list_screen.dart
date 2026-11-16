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
class TasksListScreen extends StatefulWidget {
  /// Creates the list backed by [repository].
  const TasksListScreen({super.key, required this.repository});

  final TasksRepository repository;

  @override
  State<TasksListScreen> createState() => _TasksListScreenState();
}

class _TasksListScreenState extends State<TasksListScreen> {
  final _searchController = TextEditingController();
  late final TasksListController _list;
  String? _selectedId;

  @override
  void initState() {
    super.initState();
    _list = TasksListController(widget.repository)..start();
  }

  @override
  void dispose() {
    _list.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadMore() async {
    try {
      await _list.loadMore();
    } on Exception catch (error) {
      if (!mounted) return;
      showActionError(
        context,
        error,
        message: TasksLocalizations.of(context).loadError,
      );
    }
  }

  void _openTask(Task task) => context.go(TasksPaths.detail(task.id));

  void _createTask() => context.go(TasksPaths.create);

  void _select(Task task) => setState(() => _selectedId = task.id);

  @override
  Widget build(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    return AppPage(
      title: l10n.screenTitle,
      floatingActionButton: AccessGate(
        rule: tasksWriteRule,
        child: FloatingActionButton.extended(
          onPressed: _createTask,
          icon: const Icon(Icons.add),
          label: Text(l10n.newTask),
        ),
      ),
      body: PlatformScreen(
        compact: (ctx) => _buildList(onOpen: _openTask),
        expanded: (ctx) => Row(
          children: [
            SizedBox(width: 360, child: _buildList(onOpen: _select)),
            const VerticalDivider(width: 1),
            Expanded(child: _buildDetailPane(l10n)),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailPane(TasksLocalizations l10n) {
    final selected = _selectedId;
    if (selected == null) {
      return EmptyState(icon: Icons.task_alt, title: l10n.selectTask);
    }
    return TaskDetailView(
      key: ValueKey(selected),
      repository: widget.repository,
      taskId: selected,
      onDeleted: () => setState(() => _selectedId = null),
    );
  }

  Widget _buildList({required ValueChanged<Task> onOpen}) {
    final l10n = TasksLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.md,
            AppSpacing.sm,
            AppSpacing.md,
            0,
          ),
          child: TextField(
            controller: _searchController,
            onChanged: _list.search,
            decoration: InputDecoration(
              hintText: l10n.searchHint,
              prefixIcon: const Icon(Icons.search),
              border: const OutlineInputBorder(),
            ),
          ),
        ),
        Expanded(
          child: ListenableBuilder(
            listenable: _list,
            builder: (context, _) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    AppSpacing.md,
                    AppSpacing.sm,
                    AppSpacing.md,
                    AppSpacing.sm,
                  ),
                  child: Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      for (final (status, label) in _statusFilters(l10n))
                        ChoiceChip(
                          label: Text(label),
                          selected: _list.status == status,
                          onSelected: (_) => _list.filter(status),
                        ),
                    ],
                  ),
                ),
                Expanded(
                  child: AsyncValueView<List<Task>>(
                    value: _list.items,
                    errorMessage: l10n.loadError,
                    onRetry: _list.reload,
                    data: (items) => _buildItems(items, onOpen, l10n),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  List<(TaskStatus?, String)> _statusFilters(TasksLocalizations l10n) => [
    (null, l10n.filterAll),
    (TaskStatus.open, l10n.filterOpen),
    (TaskStatus.inProgress, l10n.filterInProgress),
    (TaskStatus.done, l10n.filterDone),
  ];

  Widget _buildItems(
    List<Task> items,
    ValueChanged<Task> onOpen,
    TasksLocalizations l10n,
  ) {
    if (items.isEmpty) {
      return _list.searching
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
    final hasMore = _list.hasMore;
    return ListView.separated(
      itemCount: items.length + (hasMore ? 1 : 0),
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        if (index == items.length) {
          return Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Center(
              child: _list.loadingMore
                  ? const CircularProgressIndicator()
                  : OutlinedButton(
                      onPressed: _loadMore,
                      child: Text(AppLocalizations.of(context).loadMore),
                    ),
            ),
          );
        }
        final task = items[index];
        return ListTile(
          key: ValueKey(task.id),
          selected: task.id == _selectedId,
          title: Text(task.title),
          subtitle: Text(taskStatusLabel(l10n, task.status)),
          onTap: () => onOpen(task),
        );
      },
    );
  }
}
