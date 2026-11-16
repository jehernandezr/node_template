import 'package:contracts/contracts.dart';
import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart';

import '../data/tasks_repository.dart';
import '../shared/types/task.dart';
import 'task_form_state.dart';

/// State of the task form: loads the task being edited, saves, and tells the
/// screen when to navigate by reaching [TaskFormSaved].
final class TaskFormController extends ChangeNotifier {
  /// Controller over [repository]. A null [taskId] creates a new task. Call
  /// [start] once.
  TaskFormController(this._repository, {this.taskId})
    : _state = taskId == null
          ? const TaskFormEditing()
          : const TaskFormLoading() {
    final id = taskId;
    if (id != null) {
      _loader = AsyncLoader<Task>(() => _repository.get(id))
        ..addListener(_onLoaded);
    }
  }

  final TasksRepository _repository;

  /// Id of the task being edited, or null when creating.
  final String? taskId;

  AsyncLoader<Task>? _loader;
  final ActionRunner _runner = ActionRunner();
  TaskFormState _state;

  /// The task as last loaded, kept so a failed save still shows it.
  Task? _loaded;
  bool _disposed = false;

  /// Whether the form edits an existing task.
  bool get isEditing => taskId != null;

  /// Current state.
  TaskFormState get state => _state;

  /// Loads the task being edited, or goes straight to [TaskFormEditing] when
  /// creating. Also the retry of a failed load.
  Future<void> start() async {
    final loader = _loader;
    if (loader == null) return;
    _state = const TaskFormLoading();
    _notify();
    await loader.load();
  }

  /// Creates or updates the task. Goes through [TaskFormSaving] and ends in
  /// [TaskFormSaved], or back in [TaskFormEditing] (with the field errors of a
  /// contract violation) when it fails.
  Future<ActionResult<Task>> save(TaskDraft draft) async {
    // A second press while the first save is in flight, or after it
    // succeeded, must not write the task twice.
    if (_state is TaskFormSaving || _state is TaskFormSaved) {
      return const ActionSkipped<Task>();
    }
    _state = const TaskFormSaving();
    _notify();
    final id = taskId;
    final result = await _runner.run<Task>(
      () => id == null
          ? _repository.create(draft)
          : _repository.update(id, draft),
    );
    _state = switch (result) {
      ActionSucceeded<Task>(:final value) => TaskFormSaved(value.id),
      ActionFailed<Task>(error: final ContractViolationException violation) =>
        TaskFormEditing(task: _loaded, fieldErrors: _fieldErrors(violation)),
      ActionFailed<Task>() ||
      ActionSkipped<Task>() => TaskFormEditing(task: _loaded),
    };
    _notify();
    return result;
  }

  void _onLoaded() {
    if (_state is TaskFormSaving || _state is TaskFormSaved) return;
    final loader = _loader;
    if (loader == null) return;
    _state = switch (loader.value) {
      AsyncLoading<Task>() => const TaskFormLoading(),
      AsyncData<Task>(:final value) => _editingWith(value),
      AsyncError<Task>(:final error) => TaskFormLoadFailed(error),
    };
    _notify();
  }

  TaskFormEditing _editingWith(Task task) {
    _loaded = task;
    return TaskFormEditing(task: task);
  }

  /// First error code of each field that the contract violation names.
  static Map<String, String> _fieldErrors(ContractViolationException error) => {
    for (final entry in fieldErrorsByField(error.errors).entries)
      if (entry.value.isNotEmpty) entry.key: entry.value.first,
  };

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _loader?.dispose();
    _runner.dispose();
    super.dispose();
  }
}
