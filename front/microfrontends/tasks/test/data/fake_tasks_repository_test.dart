import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/data/uuid_v7_generator.dart';
import 'package:mf_tasks/src/shared/enums/tasks_operation.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

String _hex48(DateTime time) =>
    time.millisecondsSinceEpoch.toRadixString(16).padLeft(12, '0');

void main() {
  late FakeClock clock;
  late DemoBehavior behavior;
  late FakeTasksRepository repository;

  setUp(() {
    clock = FakeClock();
    behavior = DemoBehavior(clock: clock.now);
    repository = FakeTasksRepository(
      behavior: behavior,
      ids: UuidV7Generator(clock: clock.now, random: Random(1)),
      seed: const [],
    );
    addTearDown(repository.dispose);
  });

  test('ids of created tasks come out in creation order', () async {
    final created = <String>[];
    for (var i = 0; i < 3; i++) {
      created.add((await repository.create(TaskDraft(title: 'T$i'))).id);
    }

    expect(created, orderedEquals(([...created]..sort())));
  });

  test('a failure on get leaves list working and only one get fails', () async {
    final id = (await repository.create(const TaskDraft(title: 'Una'))).id;
    behavior.failNext(const FakeFailure(), operation: TasksOperation.get);

    expect((await repository.list()).items, hasLength(1));
    await expectLater(repository.get(id), throwsA(isA<FakeFailure>()));
    expect((await repository.get(id)).title, 'Una');
  });

  test('a failure without operation hits the next call of any kind', () async {
    behavior.failNext(const FakeFailure());

    await expectLater(repository.list(), throwsA(isA<FakeFailure>()));
    expect((await repository.list()).items, isEmpty);
  });

  test('after dispose calls throw DemoDisposedException', () async {
    repository.dispose();

    expect(repository.isDisposed, isTrue);
    await expectLater(repository.list(), throwsA(isA<DemoDisposedException>()));
  });

  test('create, update and delete each emit on changes', () async {
    var events = 0;
    final subscription = repository.changes().listen((_) => events++);
    addTearDown(subscription.cancel);

    final task = await repository.create(const TaskDraft(title: 'Una'));
    await repository.update(task.id, const TaskDraft(title: 'Dos'));
    await repository.delete(task.id);
    await pumpEventQueue();

    expect(events, 3);
  });

  test('without a seed the demo tasks are listed', () async {
    final demo = FakeTasksRepository();
    addTearDown(demo.dispose);

    final titles = (await demo.list()).items.map((task) => task.title);

    expect(titles, [for (final draft in demoTasks) draft.title]);
  });

  test('ids follow the clock of the behavior, not DateTime.now', () async {
    final created = await repository.create(const TaskDraft(title: 'Reloj'));

    expect(
      created.id.replaceAll('-', '').substring(0, 12),
      _hex48(clock.now()),
    );
  });
}
