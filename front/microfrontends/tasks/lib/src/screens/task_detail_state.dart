import 'package:ui/ui.dart';

import '../shared/types/task.dart';

/// What the task detail shows.
sealed class TaskDetailState {
  const TaskDetailState();
}

/// The task, loading, loaded or failed.
final class TaskDetailShowing extends TaskDetailState {
  const TaskDetailShowing(this.task);

  final AsyncValue<Task> task;
}

/// The delete is running.
final class TaskDetailDeleting extends TaskDetailState {
  const TaskDetailDeleting();
}

/// The task was deleted. The screen leaves the page.
final class TaskDetailDeleted extends TaskDetailState {
  const TaskDetailDeleted();
}
