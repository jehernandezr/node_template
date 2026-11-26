import '../shared/types/task.dart';

/// What the task form shows. Only [TaskFormSaved] makes the screen navigate.
sealed class TaskFormState {
  const TaskFormState();
}

/// The task being edited is loading.
final class TaskFormLoading extends TaskFormState {
  /// The task is loading.
  const TaskFormLoading();
}

/// The task being edited could not be loaded.
final class TaskFormLoadFailed extends TaskFormState {
  /// The task could not load because of [error].
  const TaskFormLoadFailed(this.error);

  /// Error of the load.
  final Object error;
}

/// The user fills the form. [task] is the one being edited, null when
/// creating. [fieldErrors] maps a field name to the first error code of the
/// last save that broke the contract.
final class TaskFormEditing extends TaskFormState {
  /// The user edits [task], with the [fieldErrors] of the last save.
  const TaskFormEditing({this.task, this.fieldErrors = const {}});

  /// Task being edited, or `null` for a new one.
  final Task? task;

  /// Error message of each field.
  final Map<String, String> fieldErrors;
}

/// A save is running.
final class TaskFormSaving extends TaskFormState {
  /// The task is being saved.
  const TaskFormSaving();
}

/// The save finished. [taskId] is the id of the created or updated task.
final class TaskFormSaved extends TaskFormState {
  /// The task [taskId] was saved.
  const TaskFormSaved(this.taskId);

  /// Id of the saved task.
  final String taskId;
}
