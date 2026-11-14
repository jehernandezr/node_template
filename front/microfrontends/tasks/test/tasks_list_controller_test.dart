import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/data/tasks_repository.dart';
import 'package:mf_tasks/src/screens/tasks_list_controller.dart';
import 'package:mf_tasks/src/shared/constants/tasks_pagination.dart';
import 'package:mf_tasks/src/shared/enums/task_status.dart';
import 'package:mf_tasks/src/shared/types/task.dart';

import 'support.dart';

const _seed = [
  TaskDraft(title: 'Pagar factura de luz'),
  TaskDraft(title: 'Revisar factura de proveedor'),
  TaskDraft(title: 'Preparar informe', status: TaskStatus.done),
];

List<String> _titles(TasksListController list) => [
  for (final task in list.items.valueOrNull ?? <Task>[]) task.title,
];

void main() {
  late FakeTasksRepository repository;
  late TasksListController list;

  setUp(() {
    repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    list = TasksListController(repository, searchDelay: Duration.zero);
    addTearDown(list.dispose);
    addTearDown(repository.dispose);
  });

  test('loads the first page on start', () async {
    list.start();
    expect(list.items.isLoading, isTrue);
    await pumpEventQueue();

    expect(_titles(list), hasLength(3));
  });

  test('filters by status', () async {
    list.start();
    await pumpEventQueue();

    list.filter(TaskStatus.done);
    await pumpEventQueue();

    expect(_titles(list), ['Preparar informe']);
    expect(list.status, TaskStatus.done);
  });

  // testWidgets for its fake clock: the debounce is a timer.
  testWidgets('searches only after the user stops typing', (tester) async {
    final debounced = TasksListController(repository);
    addTearDown(debounced.dispose);
    debounced.start();
    await tester.pump();

    debounced.search('f');
    debounced.search('fac');
    debounced.search('factura');
    await tester.pump(TasksListController.searchDebounce ~/ 2);
    expect(debounced.searching, isFalse);

    await tester.pump(TasksListController.searchDebounce);
    await tester.pump();
    expect(debounced.query, 'factura');
    expect(_titles(debounced), [
      'Pagar factura de luz',
      'Revisar factura de proveedor',
    ]);
  });

  test('an older answer never replaces a newer one', () async {
    final slow = _GatedRepository(repository);
    final gated = TasksListController(slow, searchDelay: Duration.zero);
    addTearDown(gated.dispose);
    gated.start();
    final first = slow.pending.removeLast();

    gated.filter(TaskStatus.done);
    slow.pending.removeLast().complete();
    await pumpEventQueue();
    expect(_titles(gated), ['Preparar informe']);

    first.complete();
    await pumpEventQueue();
    expect(_titles(gated), ['Preparar informe']);
  });

  test('a failed next page keeps the list and is rethrown', () async {
    final seed = [for (var i = 0; i < 25; i++) TaskDraft(title: 'Tarea $i')];
    final paged = FakeTasksRepository(delay: Duration.zero, seed: seed);
    addTearDown(paged.dispose);
    final pages = TasksListController(paged);
    addTearDown(pages.dispose);
    pages.start();
    await pumpEventQueue();
    final before = _titles(pages);
    expect(pages.hasMore, isTrue);

    paged.failNext(const ApiErrorException(unavailableProblem));
    await expectLater(pages.loadMore(), throwsA(isA<ApiErrorException>()));

    expect(_titles(pages), before);
    expect(pages.loadingMore, isFalse);
  });
}

/// Holds every `list` answer until the test completes its gate.
final class _GatedRepository implements TasksRepository {
  _GatedRepository(this.inner);

  final TasksRepository inner;
  final List<Completer<void>> pending = [];

  @override
  Future<TasksPage> list({
    TaskStatus? status,
    String? cursor,
    int limit = tasksPageSize,
  }) {
    final gate = Completer<void>();
    pending.add(gate);
    return gate.future.then(
      (_) => inner.list(status: status, cursor: cursor, limit: limit),
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) =>
      switch (invocation.memberName) {
        #changes => const Stream<void>.empty(),
        #dispose => null,
        _ => throw UnimplementedError('${invocation.memberName}'),
      };
}
