import 'dart:async';

import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/task.dart';
import '../data/tasks_repository.dart';
import '../l10n/generated/tasks_localizations.dart';
import 'task_detail_view.dart';
import 'task_status_label.dart';

/// Route `/tasks`: tasks with status filter, search and cursor pagination.
///
/// Compact widths open a task's route; wide widths show the selected task
/// beside the list. The list reloads whenever the repository changes.
class TasksListScreen extends StatefulWidget {
  /// Creates the list backed by [repository].
  const TasksListScreen({super.key, required this.repository});

  final TasksRepository repository;

  @override
  State<TasksListScreen> createState() => _TasksListScreenState();
}

class _TasksListScreenState extends State<TasksListScreen> {
  final _searchController = TextEditingController();
  StreamSubscription<void>? _changes;
  TaskStatus? _status;
  String _query = '';
  List<Task> _items = const [];
  String? _nextCursor;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _error;
  String? _selectedId;
  int _requestId = 0;

  bool get _searching => _query.isNotEmpty;

  @override
  void initState() {
    super.initState();
    _changes = widget.repository.changes().listen((_) => _reload());
    _reload();
  }

  @override
  void dispose() {
    _changes?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  /// Loads the first page, or the search results. Older requests are ignored.
  Future<void> _reload() async {
    final request = ++_requestId;
    setState(() {
      _loading = true;
      _loadingMore = false;
      _error = null;
    });
    try {
      final List<Task> items;
      String? next;
      if (_searching) {
        items = await widget.repository.search(_query, status: _status);
      } else {
        final page = await widget.repository.list(status: _status);
        items = page.items;
        next = page.nextCursor;
      }
      if (!mounted || request != _requestId) return;
      setState(() {
        _items = items;
        _nextCursor = next;
        _loading = false;
      });
    } catch (error) {
      if (!mounted || request != _requestId) return;
      setState(() {
        _error = error;
        _loading = false;
      });
    }
  }

  /// Appends the next page to the current list.
  Future<void> _loadMore() async {
    final cursor = _nextCursor;
    if (cursor == null || _loadingMore) return;
    final request = _requestId;
    setState(() => _loadingMore = true);
    try {
      final page = await widget.repository.list(
        status: _status,
        cursor: cursor,
      );
      if (!mounted || request != _requestId) return;
      setState(() {
        _items = [..._items, ...page.items];
        _nextCursor = page.nextCursor;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted || request != _requestId) return;
      setState(() => _loadingMore = false);
    }
  }

  void _selectStatus(TaskStatus? status) {
    if (status == _status) return;
    _status = status;
    _reload();
  }

  void _onSearchChanged(String value) {
    _query = value.trim();
    _reload();
  }

  void _openTask(Task task) => context.go('/tasks/${task.id}');

  void _createTask() => context.go('/tasks/new');

  void _select(Task task) => setState(() => _selectedId = task.id);

  @override
  Widget build(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.screenTitle)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createTask,
        icon: const Icon(Icons.add),
        label: Text(l10n.newTask),
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
    final shared = AppLocalizations.of(context);
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
            onChanged: _onSearchChanged,
            decoration: InputDecoration(
              hintText: TasksLocalizations.of(context).searchHint,
              prefixIcon: const Icon(Icons.search),
              border: const OutlineInputBorder(),
            ),
          ),
        ),
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
              for (final (status, label) in _statusFilters(context))
                ChoiceChip(
                  label: Text(label),
                  selected: _status == status,
                  onSelected: (_) => _selectStatus(status),
                ),
            ],
          ),
        ),
        Expanded(child: _buildBody(onOpen, shared)),
      ],
    );
  }

  List<(TaskStatus?, String)> _statusFilters(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    return [
      (null, l10n.filterAll),
      (TaskStatus.open, l10n.filterOpen),
      (TaskStatus.inProgress, l10n.filterInProgress),
      (TaskStatus.done, l10n.filterDone),
    ];
  }

  Widget _buildBody(ValueChanged<Task> onOpen, AppLocalizations shared) {
    final l10n = TasksLocalizations.of(context);
    if (_loading) return const LoadingView();
    final error = _error;
    if (error != null) {
      return ErrorView.fromException(
        error,
        fallbackMessage: l10n.loadError,
        codeLabel: AppLocalizations.of(context).errorCodeLabel,
        traceIdLabel: AppLocalizations.of(context).errorTraceIdLabel,
        retryLabel: AppLocalizations.of(context).actionRetry,
        onRetry: _reload,
      );
    }
    if (_items.isEmpty) {
      return _searching
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
    final hasMore = _nextCursor != null;
    return ListView.separated(
      itemCount: _items.length + (hasMore ? 1 : 0),
      separatorBuilder: (context, index) => const Divider(height: 1),
      itemBuilder: (context, index) {
        if (index == _items.length) {
          return Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Center(
              child: _loadingMore
                  ? const CircularProgressIndicator()
                  : OutlinedButton(
                      onPressed: _loadMore,
                      child: Text(shared.loadMore),
                    ),
            ),
          );
        }
        final task = _items[index];
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
