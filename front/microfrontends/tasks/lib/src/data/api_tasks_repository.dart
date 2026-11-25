import 'dart:async';

import 'package:api/api.dart';
import 'package:contracts/contracts.dart' as api;

import '../shared/constants/tasks_pagination.dart';
import '../shared/enums/task_status.dart';
import '../shared/types/task.dart';
import 'tasks_repository.dart';

/// [TasksRepository] over the tasks API, with the generated [api.TasksRoutes]
/// and [ApiClient], which validates every request before it is sent.
///
/// `TASKS.TASK.NOT_FOUND` becomes [TaskNotFoundException]; any other problem
/// reaches the caller as [api.ApiErrorException]. [changes] emits after each
/// write made through this repository.
final class ApiTasksRepository implements TasksRepository {
  ApiTasksRepository({required this._client});

  final ApiClient _client;
  final StreamController<void> _changes = StreamController<void>.broadcast();

  @override
  Future<TasksPage> list({
    TaskStatus? status,
    String? cursor,
    int limit = tasksPageSize,
  }) =>
      _page(api.ListTasksRequest(status: status, limit: limit, after: cursor));

  @override
  Future<TasksPage> search(
    String query, {
    TaskStatus? status,
    String? cursor,
    int limit = tasksPageSize,
  }) => _page(
    api.ListTasksRequest(
      status: status,
      q: query.trim(),
      limit: limit,
      after: cursor,
    ),
  );

  @override
  Future<Task> get(String id) async => _toTask(
    await _orNotFound(
      id,
      () =>
          _client.send(api.TasksRoutes.getTask, api.GetTaskRequest(taskId: id)),
    ),
  );

  /// The contract creates every task open: a draft in another status is
  /// moved there right after it is created.
  @override
  Future<Task> create(TaskDraft draft) async {
    final created = await _client.send(
      api.TasksRoutes.createTask,
      api.CreateTaskRequest(
        title: draft.title.trim(),
        description: draft.description.trim(),
      ),
    );
    final task = draft.status == created.status
        ? created
        : await _client.send(
            api.TasksRoutes.updateTask,
            api.UpdateTaskRequest(
              taskId: created.id,
              status: draft.status,
              expectedVersion: created.version,
            ),
          );
    return _written(_toTask(task));
  }

  @override
  Future<Task> update(String id, TaskDraft draft) async {
    final task = await _orNotFound(
      id,
      () => _client.send(
        api.TasksRoutes.updateTask,
        api.UpdateTaskRequest(
          taskId: id,
          title: draft.title.trim(),
          description: draft.description.trim(),
          status: draft.status,
        ),
      ),
    );
    return _written(_toTask(task));
  }

  @override
  Future<void> delete(String id) async {
    await _orNotFound(
      id,
      () => _client.send(
        api.TasksRoutes.deleteTask,
        api.DeleteTaskRequest(taskId: id),
      ),
    );
    _written(null);
  }

  @override
  Stream<void> changes() => _changes.stream;

  @override
  void dispose() => unawaited(_changes.close());

  Future<TasksPage> _page(api.ListTasksRequest request) async {
    final page = await _client.send(api.TasksRoutes.listTasks, request);
    return TasksPage(
      items: [for (final task in page.items) _toTask(task)],
      nextCursor: page.nextCursor,
    );
  }

  /// Runs [call] for the task [id] and turns `TASKS.TASK.NOT_FOUND` into
  /// [TaskNotFoundException].
  Future<T> _orNotFound<T>(String id, Future<T> Function() call) async {
    try {
      return await call();
    } on api.ApiErrorException catch (error) {
      if (error.problem.code == api.TasksErrorCode.taskNotFound.code) {
        throw TaskNotFoundException(id);
      }
      rethrow;
    }
  }

  T _written<T>(T value) {
    if (!_changes.isClosed) _changes.add(null);
    return value;
  }

  static Task _toTask(api.Task task) => Task(
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
  );
}
