import 'dart:async';

import 'package:shell_core/shell_core.dart';

import '../shared/constants/tasks_pagination.dart';
import '../shared/enums/task_status.dart';
import '../shared/enums/tasks_operation.dart';
import '../shared/types/task.dart';
import 'tasks_repository.dart';
import 'uuid_v7_generator.dart';

/// Demo tasks used when no seed is given.
const List<TaskDraft> demoTasks = [
  TaskDraft(
    title: 'Revisar facturas de proveedores',
    description: 'Facturas vencidas de este mes.',
  ),
  TaskDraft(
    title: 'Preparar informe trimestral',
    description: 'Incluir cifras de ventas.',
    status: TaskStatus.inProgress,
  ),
  TaskDraft(title: 'Actualizar contactos', status: TaskStatus.done),
];

/// In-memory [TasksRepository]. Latency, programmed failures and the clock
/// come from [DemoBehavior]; the ids come from [UuidV7Generator].
///
/// Each instance keeps its own data: a new identity gets a new repository.
final class FakeTasksRepository implements TasksRepository {
  /// Demo repository with sample tasks and the failures of `DemoBehavior`.
  FakeTasksRepository({
    DemoBehavior? behavior,
    UuidV7Generator? ids,
    Iterable<TaskDraft>? seed,
  }) : this._(behavior ?? DemoBehavior(), ids, seed);

  FakeTasksRepository._(
    this._behavior,
    UuidV7Generator? ids,
    Iterable<TaskDraft>? seed,
  ) : _ids = ids ?? UuidV7Generator(clock: _behavior.now) {
    for (final draft in seed ?? demoTasks) {
      _tasks.add(_build(_ids.next(), draft));
    }
  }

  final DemoBehavior _behavior;
  final UuidV7Generator _ids;
  final List<Task> _tasks = [];
  final StreamController<void> _changes = StreamController<void>.broadcast();

  /// Whether the scope already released this repository.
  bool get isDisposed => _behavior.isDisposed;

  @override
  Future<TasksPage> list({
    TaskStatus? status,
    String? cursor,
    int limit = tasksPageSize,
  }) {
    return _behavior.respond(
      () => _page(
        _tasks.where((task) => status == null || task.status == status),
        cursor,
        limit,
      ),
      operation: TasksOperation.list,
    );
  }

  @override
  Future<TasksPage> search(
    String query, {
    TaskStatus? status,
    String? cursor,
    int limit = tasksPageSize,
  }) {
    final needle = query.trim().toLowerCase();
    return _behavior.respond(
      () => _page(
        _tasks.where(
          (task) =>
              (status == null || task.status == status) &&
              (task.title.toLowerCase().contains(needle) ||
                  task.description.toLowerCase().contains(needle)),
        ),
        cursor,
        limit,
      ),
      operation: TasksOperation.search,
    );
  }

  @override
  Future<Task> get(String id) {
    return _behavior.respond(
      () => _tasks[_indexOf(id)],
      operation: TasksOperation.get,
    );
  }

  @override
  Future<Task> create(TaskDraft draft) {
    return _behavior.respond(() {
      final task = _build(_ids.next(), draft);
      _tasks.add(task);
      _changes.add(null);
      return task;
    }, operation: TasksOperation.create);
  }

  @override
  Future<Task> update(String id, TaskDraft draft) {
    return _behavior.respond(() {
      final index = _indexOf(id);
      final task = _build(id, draft);
      _tasks[index] = task;
      _changes.add(null);
      return task;
    }, operation: TasksOperation.update);
  }

  @override
  Future<void> delete(String id) {
    return _behavior.respond(() {
      _tasks.removeAt(_indexOf(id));
      _changes.add(null);
    }, operation: TasksOperation.delete);
  }

  @override
  Stream<void> changes() => _changes.stream;

  @override
  void dispose() {
    _behavior.dispose();
    unawaited(_changes.close());
  }

  /// The page after [cursor] of [matching], which is ordered by id.
  static TasksPage _page(Iterable<Task> matching, String? cursor, int limit) {
    final after = cursor == null
        ? matching.toList()
        : matching.where((task) => task.id.compareTo(cursor) > 0).toList();
    final items = after.take(limit).toList();
    return TasksPage(
      items: items,
      nextCursor: after.length > items.length ? items.last.id : null,
    );
  }

  int _indexOf(String id) {
    final index = _tasks.indexWhere((task) => task.id == id);
    if (index < 0) throw TaskNotFoundException(id);
    return index;
  }

  Task _build(String id, TaskDraft draft) => Task(
    id: id,
    title: draft.title.trim(),
    description: draft.description.trim(),
    status: draft.status,
  );
}
