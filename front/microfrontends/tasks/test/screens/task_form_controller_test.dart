import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/screens/task_form_controller.dart';
import 'package:mf_tasks/src/screens/task_form_state.dart';
import 'package:mf_tasks/src/shared/enums/task_status.dart';
import 'package:mf_tasks/src/shared/enums/tasks_operation.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

const _seed = [
  TaskDraft(title: 'Pagar factura de luz'),
  TaskDraft(title: 'Preparar informe', status: TaskStatus.done),
];

ContractViolationException _titleTooLong() => ContractViolationException(
  routeId: 'tasks.create',
  errors: [
    FieldError(field: 'title', code: PlatformErrorCode.validationTooLong.code),
  ],
);

/// Records the state after every notification of [controller].
List<TaskFormState> _record(TaskFormController controller) {
  final states = <TaskFormState>[];
  controller.addListener(() => states.add(controller.state));
  return states;
}

void main() {
  late DemoBehavior behavior;
  late FakeTasksRepository repository;

  setUp(() {
    behavior = DemoBehavior();
    repository = FakeTasksRepository(behavior: behavior, seed: _seed);
    addTearDown(repository.dispose);
  });

  test('creating starts in TaskFormEditing without a task', () {
    final controller = TaskFormController(repository);
    addTearDown(controller.dispose);

    expect(
      controller.state,
      isA<TaskFormEditing>().having((s) => s.task, 'task', isNull),
    );
  });

  test(
    'saving a new task goes through TaskFormSaving to TaskFormSaved',
    () async {
      final controller = TaskFormController(repository);
      addTearDown(controller.dispose);
      final states = _record(controller);

      final result = await controller.save(const TaskDraft(title: 'Nueva'));

      expect(result, isA<ActionSucceeded<Task>>());
      expect(states.first, isA<TaskFormSaving>());
      expect(states.last, isA<TaskFormSaved>());
      final saved = states.last as TaskFormSaved;
      expect((await repository.get(saved.taskId)).title, 'Nueva');
    },
  );

  test('editing loads the task and then shows it', () async {
    final id = (await repository.list()).items.first.id;
    final controller = TaskFormController(repository, taskId: id);
    addTearDown(controller.dispose);
    expect(controller.state, isA<TaskFormLoading>());

    await controller.start();

    expect(
      controller.state,
      isA<TaskFormEditing>().having(
        (s) => s.task?.title,
        'title',
        'Pagar factura de luz',
      ),
    );
  });

  test(
    'a failed load shows TaskFormLoadFailed and a new start recovers it',
    () async {
      final id = (await repository.list()).items.first.id;
      final controller = TaskFormController(repository, taskId: id);
      addTearDown(controller.dispose);
      behavior.failNext(const FakeFailure(), operation: TasksOperation.get);

      await controller.start();
      expect(controller.state, isA<TaskFormLoadFailed>());

      await controller.start();
      expect(controller.state, isA<TaskFormEditing>());
    },
  );

  test('a contract violation keeps the form with the field error', () async {
    final controller = TaskFormController(repository);
    addTearDown(controller.dispose);
    behavior.failNext(_titleTooLong());

    final result = await controller.save(const TaskDraft(title: 'Nueva'));

    expect(result, isA<ActionFailed<Task>>());
    expect(
      controller.state,
      isA<TaskFormEditing>().having((s) => s.fieldErrors, 'fieldErrors', {
        'title': PlatformErrorCode.validationTooLong.code,
      }),
    );
  });

  test('another failure keeps the form without field errors', () async {
    final controller = TaskFormController(repository);
    addTearDown(controller.dispose);
    behavior.failNext(const FakeFailure());

    final result = await controller.save(const TaskDraft(title: 'Nueva'));

    expect(result, isA<ActionFailed<Task>>());
    expect(
      controller.state,
      isA<TaskFormEditing>().having(
        (s) => s.fieldErrors,
        'fieldErrors',
        isEmpty,
      ),
    );
  });

  test('TaskFormSaved is the only state that navigates', () async {
    final controller = TaskFormController(repository);
    addTearDown(controller.dispose);
    final states = _record(controller);
    behavior.failNext(const FakeFailure(), operation: TasksOperation.create);

    await controller.save(const TaskDraft(title: 'Fallida'));
    await controller.save(const TaskDraft(title: 'Lograda'));

    expect(states.whereType<TaskFormSaved>(), hasLength(1));
    expect(states.last, isA<TaskFormSaved>());
  });

  test('a second save while the first is saving is skipped', () async {
    final controller = TaskFormController(repository);
    addTearDown(controller.dispose);

    final first = controller.save(const TaskDraft(title: 'Uno'));
    final second = await controller.save(const TaskDraft(title: 'Dos'));

    expect(second, isA<ActionSkipped<Task>>());
    expect(await first, isA<ActionSucceeded<Task>>());
    final titles = (await repository.list()).items.map((task) => task.title);
    expect(titles, contains('Uno'));
    expect(titles, isNot(contains('Dos')));
  });

  test('a save after TaskFormSaved is skipped', () async {
    final controller = TaskFormController(repository);
    addTearDown(controller.dispose);
    await controller.save(const TaskDraft(title: 'Uno'));

    final again = await controller.save(const TaskDraft(title: 'Uno'));

    expect(again, isA<ActionSkipped<Task>>());
    final titles = (await repository.list()).items.map((task) => task.title);
    expect(titles.where((title) => title == 'Uno'), hasLength(1));
  });

  test('saving an edit updates the task and ends in TaskFormSaved', () async {
    final id = (await repository.list()).items.first.id;
    final controller = TaskFormController(repository, taskId: id);
    addTearDown(controller.dispose);
    await controller.start();

    final result = await controller.save(
      const TaskDraft(title: 'Pagar factura de agua'),
    );

    expect(result, isA<ActionSucceeded<Task>>());
    expect(
      controller.state,
      isA<TaskFormSaved>().having((s) => s.taskId, 'taskId', id),
    );
    expect((await repository.get(id)).title, 'Pagar factura de agua');
  });
}
