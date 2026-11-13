import '../enums/task_status.dart';

/// A task as the UI sees it.
final class Task {
  const Task({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
  });

  /// UUIDv7 string. Sorting by id is sorting by creation time.
  final String id;
  final String title;
  final String description;
  final TaskStatus status;
}

/// Input for creating or updating a task.
final class TaskDraft {
  const TaskDraft({
    required this.title,
    this.description = '',
    this.status = TaskStatus.open,
  });

  final String title;
  final String description;
  final TaskStatus status;
}

/// One page of tasks. [nextCursor] is null on the last page.
final class TasksPage {
  const TasksPage({required this.items, this.nextCursor});

  final List<Task> items;
  final String? nextCursor;
}

/// Thrown when no task has the requested [id].
final class TaskNotFoundException implements Exception {
  const TaskNotFoundException(this.id);

  final String id;

  @override
  String toString() => 'TaskNotFoundException: $id';
}
