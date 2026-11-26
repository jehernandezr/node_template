import 'package:ui/ui.dart';

import '../shared/types/task.dart';

/// What the task detail shows.
sealed class TaskDetailState {
  const TaskDetailState();
}

/// The task, loading, loaded or failed.
final class TaskDetailShowing extends TaskDetailState {
  /// Shows [task].
  const TaskDetailShowing(this.task);

  /// The task, or the state of its load.
  final AsyncValue<Task> task;
}

/// The delete is running.
final class TaskDetailDeleting extends TaskDetailState {
  /// The task is being deleted.
  const TaskDetailDeleting();
}

/// The task was deleted. The screen leaves the page.
final class TaskDetailDeleted extends TaskDetailState {
  /// The task was deleted.
  const TaskDetailDeleted();
}
