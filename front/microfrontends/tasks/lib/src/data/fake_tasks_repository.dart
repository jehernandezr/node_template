import 'dart:async';
import 'dart:math';

import '../shared/constants/tasks_pagination.dart';
import '../shared/enums/task_status.dart';
import '../shared/types/task.dart';
import 'tasks_repository.dart';

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

/// In-memory [TasksRepository] with a small artificial [delay].
///
/// Each instance keeps its own data: a new identity gets a new repository.
/// [failNext] makes the next calls throw, to exercise error paths.
///
/// Ids are UUIDv7 strings generated in creation order: a 48-bit millisecond
/// timestamp, a 12-bit counter for ids created within the same millisecond,
/// and random bits.
final class FakeTasksRepository implements TasksRepository {
  FakeTasksRepository({
    this.delay = const Duration(milliseconds: 300),
    Iterable<TaskDraft>? seed,
  }) {
    for (final draft in seed ?? demoTasks) {
      _tasks.add(_build(_newId(), draft));
    }
  }

  final Duration delay;
  final List<Task> _tasks = [];
  final List<Object> _failures = [];
  final StreamController<void> _changes = StreamController<void>.broadcast();
  final Random _random = Random();
  int _lastMs = 0;
  int _seq = 0;

  /// Makes the next [count] calls, of any kind, throw [error].
  void failNext(Object error, {int count = 1}) {
    _failures.addAll(List.filled(count, error));
  }

  @override
  Future<TasksPage> list({
    TaskStatus? status,
    String? cursor,
    int limit = tasksPageSize,
  }) async {
    await _pause();
    final matching = _tasks
        .where((task) => status == null || task.status == status)
        .toList();
    var start = 0;
    if (cursor != null) {
      start = matching.indexWhere((task) => task.id.compareTo(cursor) > 0);
      if (start < 0) start = matching.length;
    }
    final items = matching.skip(start).take(limit).toList();
    final hasMore = start + items.length < matching.length;
    return TasksPage(items: items, nextCursor: hasMore ? items.last.id : null);
  }

  @override
  Future<List<Task>> search(String query, {TaskStatus? status}) async {
    await _pause();
    final needle = query.trim().toLowerCase();
    return _tasks
        .where(
          (task) =>
              (status == null || task.status == status) &&
              (task.title.toLowerCase().contains(needle) ||
                  task.description.toLowerCase().contains(needle)),
        )
        .toList();
  }

  @override
  Future<Task> get(String id) async {
    await _pause();
    return _tasks[_indexOf(id)];
  }

  @override
  Future<Task> create(TaskDraft draft) async {
    await _pause();
    final task = _build(_newId(), draft);
    _tasks.add(task);
    _changes.add(null);
    return task;
  }

  @override
  Future<Task> update(String id, TaskDraft draft) async {
    await _pause();
    final index = _indexOf(id);
    final task = _build(id, draft);
    _tasks[index] = task;
    _changes.add(null);
    return task;
  }

  @override
  Future<void> delete(String id) async {
    await _pause();
    _tasks.removeAt(_indexOf(id));
    _changes.add(null);
  }

  @override
  Stream<void> changes() => _changes.stream;

  @override
  void dispose() {
    _changes.close();
  }

  /// Waits [delay], then throws the next queued failure, if any.
  Future<void> _pause() async {
    await Future<void>.delayed(delay);
    if (_failures.isNotEmpty) throw _failures.removeAt(0);
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

  String _newId() {
    var ms = DateTime.now().millisecondsSinceEpoch;
    if (ms <= _lastMs) {
      ms = _lastMs;
      _seq += 1;
      if (_seq > 0xfff) {
        ms = _lastMs + 1;
        _seq = _random.nextInt(0x800);
      }
    } else {
      _seq = _random.nextInt(0x800);
    }
    _lastMs = ms;
    final time = _hex(ms, 12);
    final variant = _hex(0x8 | _random.nextInt(4), 1);
    return '${time.substring(0, 8)}-${time.substring(8)}-'
        '7${_hex(_seq, 3)}-'
        '$variant${_hex(_random.nextInt(0x1000), 3)}-'
        '${_hex(_random.nextInt(0x1000000), 6)}'
        '${_hex(_random.nextInt(0x1000000), 6)}';
  }

  static String _hex(int value, int width) =>
      value.toRadixString(16).padLeft(width, '0');
}
