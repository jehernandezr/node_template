import '../shared/types/task.dart';

/// What the task form shows. Only [TaskFormSaved] makes the screen navigate.
sealed class TaskFormState {
  const TaskFormState();
}

/// The task being edited is loading.
final class TaskFormLoading extends TaskFormState {
  const TaskFormLoading();
}

/// The task being edited could not be loaded.
final class TaskFormLoadFailed extends TaskFormState {
  const TaskFormLoadFailed(this.error);

  final Object error;
}

/// The user fills the form. [task] is the one being edited, null when
/// creating. [fieldErrors] maps a field name to the first error code of the
/// last save that broke the contract.
final class TaskFormEditing extends TaskFormState {
  const TaskFormEditing({this.task, this.fieldErrors = const {}});

  final Task? task;
  final Map<String, String> fieldErrors;
}

/// A save is running.
final class TaskFormSaving extends TaskFormState {
  const TaskFormSaving();
}

/// The save finished. [taskId] is the id of the created or updated task.
final class TaskFormSaved extends TaskFormState {
  const TaskFormSaved(this.taskId);

  final String taskId;
}
