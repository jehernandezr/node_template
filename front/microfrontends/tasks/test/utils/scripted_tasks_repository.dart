import 'dart:async';

import 'package:mf_tasks/src/data/tasks_repository.dart';
import 'package:mf_tasks/src/shared/constants/tasks_pagination.dart';
import 'package:mf_tasks/src/shared/enums/task_status.dart';
import 'package:mf_tasks/src/shared/types/task.dart';

/// Repository whose `get` and `delete` answers finish when the test completes
/// them, so a test can answer calls out of order or change the data while a
/// call is pending.
final class ScriptedTasksRepository implements TasksRepository {
  /// One completer per call to [get], in call order.
  final List<Completer<Task>> gets = [];

  /// One completer per call to [delete], in call order.
  final List<Completer<void>> deletes = [];

  /// Stands for the changes of the repository: adding an event reloads.
  final StreamController<void> changesController =
      StreamController<void>.broadcast();

  int get getCalls => gets.length;

  int get deleteCalls => deletes.length;

  @override
  Future<Task> get(String id) {
    final completer = Completer<Task>();
    gets.add(completer);
    return completer.future;
  }

  @override
  Future<void> delete(String id) {
    final completer = Completer<void>();
    deletes.add(completer);
    return completer.future;
  }

  @override
  Stream<void> changes() => changesController.stream;

  @override
  void dispose() {
    unawaited(changesController.close());
  }

  @override
  Future<TasksPage> list({
    TaskStatus? status,
    String? cursor,
    int limit = tasksPageSize,
  }) => throw UnimplementedError();

  @override
  Future<TasksPage> search(
    String query, {
    TaskStatus? status,
    String? cursor,
    int limit = tasksPageSize,
  }) => throw UnimplementedError();

  @override
  Future<Task> create(TaskDraft draft) => throw UnimplementedError();

  @override
  Future<Task> update(String id, TaskDraft draft) => throw UnimplementedError();
}
