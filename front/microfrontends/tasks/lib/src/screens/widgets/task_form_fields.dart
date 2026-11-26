import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../l10n/generated/tasks_localizations.dart';
import '../../shared/enums/task_status.dart';
import '../../shared/types/task.dart';
import '../task_status_label.dart';

/// The fields of the task form. The text the user types lives here, so a
/// rebuild of the screen (a failed save, a field error) keeps it.
class TaskFormFields extends StatefulWidget {
  /// Creates the fields. [task] seeds them once; null leaves them empty.
  const TaskFormFields({
    super.key,
    required this.task,
    required this.fieldErrors,
    required this.saving,
    required this.onSubmit,
  });

  /// Task the fields start from, null when creating.
  final Task? task;

  /// Message codes of the last save, by field name.
  final Map<String, String> fieldErrors;

  /// Whether a save is running; the button shows its loading state.
  final bool saving;

  /// Receives the draft when the form validates.
  final ValueChanged<TaskDraft> onSubmit;

  @override
  State<TaskFormFields> createState() => _TaskFormFieldsState();
}

class _TaskFormFieldsState extends State<TaskFormFields> {
  static const String _titleField = 'title';
  static const String _descriptionField = 'description';

  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _title;
  late final TextEditingController _description;
  late TaskStatus _status;

  /// Seeded once: a later task from the parent must not overwrite the text the user is typing.
  @override
  void initState() {
    super.initState();
    final task = widget.task;
    _title = TextEditingController(text: task?.title ?? '');
    _description = TextEditingController(text: task?.description ?? '');
    _status = task?.status ?? TaskStatus.open;
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    super.dispose();
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    widget.onSubmit(
      TaskDraft(
        title: _title.text.trim(),
        description: _description.text.trim(),
        status: _status,
      ),
    );
  }

  /// Message of the first error code of [field], or null.
  String? _fieldError(String field, AppLocalizations shared) {
    final code = widget.fieldErrors[field];
    return code == null ? null : errorMessage(shared, code);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = TasksLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    return Form(
      key: _formKey,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          TextFormField(
            controller: _title,
            autofocus: widget.task == null,
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(
              labelText: l10n.titleLabel,
              border: const OutlineInputBorder(),
              errorText: _fieldError(_titleField, shared),
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
              errorText: _fieldError(_descriptionField, shared),
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
            loading: widget.saving,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }
}
