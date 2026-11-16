import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_tasks/src/screens/task_detail_controller.dart';
import 'package:mf_tasks/src/screens/task_detail_state.dart';
import 'package:mf_tasks/src/shared/enums/task_status.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/scripted_tasks_repository.dart';

const _taskA = Task(
  id: 'a',
  title: 'Tarea A',
  description: '',
  status: TaskStatus.open,
);

const _taskB = Task(
  id: 'a',
  title: 'Tarea B',
  description: 'Más reciente',
  status: TaskStatus.done,
);

void main() {
  late ScriptedTasksRepository repository;

  setUp(() {
    repository = ScriptedTasksRepository();
    addTearDown(repository.dispose);
  });

  test('an older answer does not replace a newer one', () async {
    final controller = TaskDetailController(repository, taskId: 'a');
    addTearDown(controller.dispose);

    unawaited(controller.start());
    unawaited(controller.start());
    repository.gets[1].complete(_taskB);
    await pumpEventQueue();
    repository.gets[0].complete(_taskA);
    await pumpEventQueue();

    final state = controller.state as TaskDetailShowing;
    expect(state.task.valueOrNull?.title, 'Tarea B');
  });

  test(
    'an external change during delete does not bring the task back',
    () async {
      final controller = TaskDetailController(repository, taskId: 'a');
      addTearDown(controller.dispose);
      unawaited(controller.start());
      repository.gets.single.complete(_taskA);
      await pumpEventQueue();

      final pendingDelete = controller.delete();
      expect(controller.state, isA<TaskDetailDeleting>());

      repository.changesController.add(null);
      await pumpEventQueue();
      expect(repository.getCalls, 1);
      expect(controller.state, isA<TaskDetailDeleting>());

      repository.deletes.single.complete();
      final result = await pendingDelete;
      await pumpEventQueue();

      expect(result, isA<ActionSucceeded<void>>());
      expect(controller.state, isA<TaskDetailDeleted>());
      expect(repository.getCalls, 1);
    },
  );

  test(
    'a failed delete goes back to showing and returns ActionFailed',
    () async {
      final controller = TaskDetailController(repository, taskId: 'a');
      addTearDown(controller.dispose);
      unawaited(controller.start());
      repository.gets.single.complete(_taskA);
      await pumpEventQueue();

      final pendingDelete = controller.delete();
      repository.deletes.single.completeError(const FakeFailure());
      final result = await pendingDelete;

      expect(result, isA<ActionFailed<void>>());
      expect(controller.state, isA<TaskDetailShowing>());
    },
  );

  test('an external change while showing reloads keeping the data', () async {
    final controller = TaskDetailController(repository, taskId: 'a');
    addTearDown(controller.dispose);
    unawaited(controller.start());
    repository.gets.single.complete(_taskA);
    await pumpEventQueue();

    repository.changesController.add(null);
    await pumpEventQueue();

    expect(repository.getCalls, 2);
    final kept = controller.state as TaskDetailShowing;
    expect(kept.task, isA<AsyncData<Task>>());
    expect(kept.task.valueOrNull?.title, 'Tarea A');

    repository.gets[1].complete(_taskB);
    await pumpEventQueue();

    final reloaded = controller.state as TaskDetailShowing;
    expect(reloaded.task.valueOrNull?.title, 'Tarea B');
  });

  test('nothing notifies after dispose', () async {
    final controller = TaskDetailController(repository, taskId: 'a');
    unawaited(controller.start());
    final pending = repository.gets.single;
    var notifications = 0;
    controller.addListener(() => notifications++);

    controller.dispose();
    pending.complete(_taskA);
    repository.changesController.add(null);
    await pumpEventQueue();

    expect(notifications, 0);
  });
}
