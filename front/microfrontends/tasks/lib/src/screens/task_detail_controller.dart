import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/tasks_repository.dart';
import '../shared/types/task.dart';
import 'task_detail_state.dart';

enum _DetailPhase { showing, deleting, deleted }

/// State of one task's detail: loads it, reloads when the repository changes
/// and deletes it.
final class TaskDetailController extends ChangeNotifier {
  /// Controller over [repository] for the task [taskId]. Call [start] once.
  TaskDetailController(this._repository, {required this.taskId}) {
    _loader.addListener(_notify);
  }

  final TasksRepository _repository;

  /// Id of the task shown.
  final String taskId;

  late final AsyncLoader<Task> _loader = AsyncLoader<Task>(
    () => _repository.get(taskId),
  );
  final ActionRunner _runner = ActionRunner();
  StreamSubscription<void>? _changes;
  _DetailPhase _phase = _DetailPhase.showing;
  bool _disposed = false;

  /// Current state.
  TaskDetailState get state => switch (_phase) {
    _DetailPhase.showing => TaskDetailShowing(_loader.value),
    _DetailPhase.deleting => const TaskDetailDeleting(),
    _DetailPhase.deleted => const TaskDetailDeleted(),
  };

  /// Loads the task and starts listening to the repository. Also the retry
  /// of a failed load.
  Future<void> start() async {
    // Changes that arrive during a delete belong to that delete: reloading
    // here would bring back the task being removed.
    _changes ??= _repository.changes().listen((_) {
      if (_phase == _DetailPhase.showing) {
        unawaited(_loader.load(keepCurrent: true));
      }
    });
    await _loader.load();
  }

  /// Deletes the task. Goes through [TaskDetailDeleting] and ends in
  /// [TaskDetailDeleted], or back in [TaskDetailShowing] when it fails.
  Future<ActionResult<void>> delete() async {
    if (_phase != _DetailPhase.showing) return const ActionSkipped<void>();
    _phase = _DetailPhase.deleting;
    _notify();
    final result = await _runner.run<void>(() => _repository.delete(taskId));
    if (result is ActionSucceeded<void>) {
      _phase = _DetailPhase.deleted;
    } else {
      _phase = _DetailPhase.showing;
      unawaited(_loader.load(keepCurrent: true));
    }
    _notify();
    return result;
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    unawaited(_changes?.cancel());
    _loader.dispose();
    _runner.dispose();
    super.dispose();
  }
}
