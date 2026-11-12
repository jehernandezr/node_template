import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/task.dart';
import '../data/tasks_repository.dart';
import '../l10n/generated/tasks_localizations.dart';
import 'task_status_label.dart';

/// Route `/tasks/new` (create) and `/tasks/:id/edit` (edit).
///
/// Saving calls the repository and navigates with `go`: to the list after a
/// create, to the task's page after an edit.
class TaskFormScreen extends StatefulWidget {
  /// Creates the form. A null [taskId] creates a new task.
  const TaskFormScreen({super.key, required this.repository, this.taskId});

  final TasksRepository repository;
  final String? taskId;

  @override
  State<TaskFormScreen> createState() => _TaskFormScreenState();
}

class _TaskFormScreenState extends State<TaskFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  TaskStatus _status = TaskStatus.open;
  bool _saving = false;

  /// Loads the task being edited into the controllers. Null when creating.
  /// Reassigned by [_retry] so a failed load runs again.
  Future<void>? _loadTask;

  bool get _editing => widget.taskId != null;

  @override
  void initState() {
    super.initState();
    _loadTask = _editing ? _load() : null;
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final task = await widget.repository.get(widget.taskId!);
    _title.text = task.title;
    _description.text = task.description;
    _status = task.status;
  }

  void _retry() {
    final load = _load();
    setState(() {
      _loadTask = load;
    });
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final draft = TaskDraft(
      title: _title.text.trim(),
      description: _description.text.trim(),
      status: _status,
    );
    final id = widget.taskId;
    setState(() => _saving = true);
    try {
      if (id == null) {
        await widget.repository.create(draft);
      } else {
        await widget.repository.update(id, draft);
      }
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(TasksLocalizations.of(context).saveError)),
      );
      return;
    }
    if (!mounted) return;
    context.go(id == null ? '/tasks' : '/tasks/$id');
  }

  Widget _form(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          TextFormField(
            controller: _title,
            autofocus: !_editing,
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              labelText: l10n.titleLabel,
              border: const OutlineInputBorder(),
            ),
            validator: (value) =>
                (value ?? '').trim().isEmpty ? l10n.titleRequired : null,
          ),
          const SizedBox(height: AppSpacing.md),
          TextFormField(
            controller: _description,
            minLines: 3,
            maxLines: 6,
            decoration: InputDecoration(
              labelText: l10n.descriptionLabel,
              border: const OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(l10n.statusLabel, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: AppSpacing.sm),
          SegmentedButton<TaskStatus>(
            segments: [
              for (final status in TaskStatus.values)
                ButtonSegment<TaskStatus>(
                  value: status,
                  label: Text(taskStatusLabel(l10n, status)),
                ),
            ],
            selected: {_status},
            onSelectionChanged: (selection) =>
                setState(() => _status = selection.first),
          ),
          const SizedBox(height: AppSpacing.lg),
          AppButton(
            label: AppLocalizations.of(context).actionSave,
            loading: _saving,
            onPressed: _save,
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    final load = _loadTask;
    return Scaffold(
      appBar: AppBar(title: Text(_editing ? l10n.editTaskTitle : l10n.newTask)),
      body: load == null
          ? _form(context)
          : FutureBuilder<void>(
              future: load,
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
                    onRetry: _retry,
                  );
                }
                if (snapshot.connectionState != ConnectionState.done) {
                  return const LoadingView();
                }
                return _form(context);
              },
            ),
    );
  }
}
