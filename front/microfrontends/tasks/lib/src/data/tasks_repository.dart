import 'task.dart';

/// Default page size of [TasksRepository.list].
const int tasksPageSize = 20;

/// Access to tasks. Screens depend only on this interface.
///
/// Errors other than [TaskNotFoundException] surface as
/// `ApiErrorException` (from `contracts`) when the API returns a problem.
abstract interface class TasksRepository {
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

  /// Releases the resources of the repository. Called when the identity
  /// changes and its scope is disposed.
  void close();
}
