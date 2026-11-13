import 'package:shell_core/shell_core.dart';

import '../shared/constants/tasks_pagination.dart';
import '../shared/enums/task_status.dart';
import '../shared/types/task.dart';

/// Access to tasks. Screens depend only on this interface.
///
/// The scope of the identity disposes it (see [ScopedResource]). Errors other
/// than [TaskNotFoundException] surface as `ApiErrorException` (from
/// `contracts`) when the API returns a problem. There is no backend contract
/// for tasks yet, so the only implementation is `FakeTasksRepository`.
abstract interface class TasksRepository implements ScopedResource {
  /// One page ordered by id. Pass the previous [TasksPage.nextCursor] as
  /// [cursor] to get the next page.
  Future<TasksPage> list({
    TaskStatus? status,
    String? cursor,
    int limit = tasksPageSize,
  });

  /// Tasks whose title or description contains [query], without paging.
  Future<List<Task>> search(String query, {TaskStatus? status});

  /// Throws [TaskNotFoundException] when the id is unknown.
  Future<Task> get(String id);

  Future<Task> create(TaskDraft draft);

  /// Throws [TaskNotFoundException] when the id is unknown.
  Future<Task> update(String id, TaskDraft draft);

  /// Throws [TaskNotFoundException] when the id is unknown.
  Future<void> delete(String id);

  /// Emits after every successful create, update or delete. Screens that show
  /// tasks reload when it emits.
  Stream<void> changes();
}
