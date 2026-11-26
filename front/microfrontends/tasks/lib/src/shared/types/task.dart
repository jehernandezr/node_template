import '../enums/task_status.dart';

/// A task as the UI sees it.
final class Task {
  /// Task of the tenant.
  const Task({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
  });

  /// UUIDv7 string. Sorting by id is sorting by creation time.
  final String id;

  /// Title of the task.
  final String title;

  /// Description of the task.
  final String description;

  /// Status of the task.
  final TaskStatus status;
}

/// Input for creating or updating a task.
final class TaskDraft {
  /// Fields of a task to create or change.
  const TaskDraft({
    required this.title,
    this.description = '',
    this.status = TaskStatus.open,
  });

  /// Title of the task.
  final String title;

  /// Description of the task.
  final String description;

  /// Status of the task.
  final TaskStatus status;
}

/// One page of tasks. [nextCursor] is null on the last page.
final class TasksPage {
  /// Page of [items] with the cursor of the next one.
  const TasksPage({required this.items, this.nextCursor});

  /// Tasks of the page.
  final List<Task> items;

  /// Cursor of the next page, or `null` at the end.
  final String? nextCursor;
}

/// Thrown when no task has the requested [id].
final class TaskNotFoundException implements Exception {
  /// Thrown when the task [id] does not exist.
  const TaskNotFoundException(this.id);

  /// Id of the task.
  final String id;

  @override
  String toString() => 'TaskNotFoundException: $id';
}
