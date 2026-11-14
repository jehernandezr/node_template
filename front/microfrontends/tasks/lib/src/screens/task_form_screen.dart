import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart';

import '../data/tasks_repository.dart';
import '../l10n/generated/tasks_localizations.dart';
import '../shared/enums/task_status.dart';
import '../shared/types/task.dart';
import 'task_status_label.dart';

/// Route `/tasks/new` (create) and `/tasks/:id/edit` (edit).
///
/// Saving calls the repository and navigates with `go`: to the list after a
/// create, to the task's page after an edit. A request that breaks the
/// contract shows its field errors under the fields; any other failure shows
/// a snack bar and keeps the form.
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

  /// Error codes of the last save, by field, from a contract violation.
  Map<String, List<String>> _fieldErrors = const {};

  /// State of the load of the task being edited. Data when creating.
  late AsyncValue<Task?> _loaded = _editing
      ? const AsyncValue.loading()
      : const AsyncValue.data(null);

  bool get _editing => widget.taskId != null;

  @override
  void initState() {
    super.initState();
    if (_editing) unawaited(_load());
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  /// Loads the task being edited into the controllers.
  Future<void> _load() async {
    final result = await AsyncValue.guard<Task?>(
      () => widget.repository.get(widget.taskId!),
    );
    if (!mounted) return;
    if (result case AsyncData<Task?>(:final value?)) {
      _title.text = value.title;
      _description.text = value.description;
      _status = value.status;
    }
    setState(() => _loaded = result);
  }

  void _retry() {
    setState(() => _loaded = const AsyncValue.loading());
    unawaited(_load());
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final draft = TaskDraft(
      title: _title.text.trim(),
      description: _description.text.trim(),
      status: _status,
    );
    final id = widget.taskId;
    setState(() {
      _saving = true;
      _fieldErrors = const {};
    });
    try {
      if (id == null) {
        await widget.repository.create(draft);
      } else {
        await widget.repository.update(id, draft);
      }
    } on ContractViolationException catch (error) {
      if (mounted) {
        setState(() => _fieldErrors = fieldErrorsByField(error.errors));
      }
      _saveFailed(error);
      return;
    } on Exception catch (error) {
      // API, network or not found.
      _saveFailed(error);
      return;
    }
    if (!mounted) return;
    context.go(id == null ? '/tasks' : '/tasks/$id');
  }

  void _saveFailed(Object error) {
    if (!mounted) return;
    setState(() => _saving = false);
    showActionError(
      context,
      error,
      message: TasksLocalizations.of(context).saveError,
    );
  }

  /// Message of the first contract error of [field], or null.
  String? _fieldError(String field, AppLocalizations shared) {
    final codes = _fieldErrors[field];
    if (codes == null || codes.isEmpty) return null;
    return errorMessage(shared, codes.first);
  }

  Widget _form(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    final shared = AppLocalizations.of(context);
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
              errorText: _fieldError('title', shared),
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
              errorText: _fieldError('description', shared),
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
            label: shared.actionSave,
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
    final shared = AppLocalizations.of(context);
    final id = widget.taskId;
    final notFound = switch (_loaded) {
      AsyncError<Task?>(:final error) => error is TaskNotFoundException,
      _ => false,
    };
    return AppPage(
      title: _editing ? l10n.editTaskTitle : l10n.newTask,
      onBack: () => context.go(id == null ? '/tasks' : '/tasks/$id'),
      body: AsyncValueView<Task?>(
        value: _loaded,
        errorMessage: notFound ? l10n.detailNotFound : l10n.detailError,
        onRetry: notFound ? null : _retry,
        retryLabel: shared.actionRetry,
        codeLabel: shared.errorCodeLabel,
        traceIdLabel: shared.errorTraceIdLabel,
        data: (_) => _form(context),
      ),
    );
  }
}
