import 'package:contracts/contracts.dart' as api;
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_tasks/src/data/api_tasks_repository.dart';
import 'package:mf_tasks/src/shared/enums/task_status.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:test_utils/test_utils.dart';

const _taskId = '0193f1c2-0000-7000-8000-000000000001';
const _userId = '0193f1c2-0000-7000-8000-0000000000aa';
const _tenantId = '0193f1c2-0000-7000-8000-0000000000bb';

Map<String, Object?> _task({
  String id = _taskId,
  String title = 'Revisar facturas',
  String status = 'open',
  int version = 1,
}) => {
  'id': id,
  'title': title,
  'description': '',
  'status': status,
  'version': version,
  'createdAt': '2026-11-20T10:00:00.000Z',
  'updatedAt': '2026-11-20T10:00:00.000Z',
  'createdBy': {'userId': _userId, 'homeTenantId': _tenantId},
};

void main() {
  late ScriptedTransport transport;
  late ApiTasksRepository repository;

  setUp(() {
    transport = ScriptedTransport();
    repository = ApiTasksRepository(client: ScriptedApi.client(transport));
  });

  tearDown(() => repository.dispose());

  test(
    'lists one page with the filter, the page size and the cursor',
    () async {
      transport.json(200, {
        'items': [_task()],
        'nextCursor': 'next-1',
      });

      final page = await repository.list(
        status: TaskStatus.inProgress,
        cursor: 'after-1',
        limit: 5,
      );

      expect(page.items.single.title, 'Revisar facturas');
      expect(page.nextCursor, 'next-1');
      final request = transport.requests.single;
      expect(request.method, 'GET');
      expect(request.uri.path, '/v1/tasks');
      expect(request.uri.queryParameters, {
        'status': 'in_progress',
        'limit': '5',
        'after': 'after-1',
      });
    },
  );

  test('searches with the same route, trimmed and paged with after', () async {
    transport.json(200, {'items': <Object>[], 'nextCursor': null});

    final page = await repository.search('  factura ', cursor: 'c-2');

    expect(page.items, isEmpty);
    expect(page.nextCursor, isNull);
    expect(transport.requests.single.uri.queryParameters, {
      'q': 'factura',
      'limit': '20',
      'after': 'c-2',
    });
  });

  test('a task the API does not find is a TaskNotFoundException', () async {
    transport.problem(
      ProblemFixtures.withCode(
        api.TasksErrorCode.taskNotFound.code,
        status: 404,
      ),
    );

    await expectLater(
      repository.get(_taskId),
      throwsA(isA<TaskNotFoundException>().having((e) => e.id, 'id', _taskId)),
    );
  });

  test('any other problem reaches the caller as it came', () async {
    transport.problem(ProblemFixtures.forbidden());

    await expectLater(
      repository.get(_taskId),
      throwsA(
        isA<api.ApiErrorException>().having(
          (e) => e.problem.code,
          'code',
          api.PlatformErrorCode.authForbidden.code,
        ),
      ),
    );
  });

  test('a malformed id never reaches the network', () async {
    await expectLater(
      repository.get('not-a-uuid'),
      throwsA(isA<api.ContractViolationException>()),
    );
    expect(transport.requests, isEmpty);
  });

  test('creates an open task with one call and tells the screens', () async {
    final changes = <void>[];
    final subscription = repository.changes().listen(changes.add);
    transport.json(201, _task(title: 'Nueva'));

    final task = await repository.create(const TaskDraft(title: ' Nueva '));
    await pumpEventQueue();

    expect(task.status, TaskStatus.open);
    expect(transport.requests.single.method, 'POST');
    expect(transport.bodyOf(0), {'title': 'Nueva', 'description': ''});
    expect(changes, hasLength(1));
    await subscription.cancel();
  });

  test('creates a task in another status and then moves it there', () async {
    transport
      ..json(201, _task(title: 'Hecha'))
      ..json(200, _task(title: 'Hecha', status: 'done', version: 2));

    final task = await repository.create(
      const TaskDraft(title: 'Hecha', status: TaskStatus.done),
    );

    expect(task.status, TaskStatus.done);
    expect(transport.requests.map((request) => request.method), [
      'POST',
      'PATCH',
    ]);
    expect(transport.bodyOf(1), {'status': 'done', 'expectedVersion': 1});
  });

  test('updates every field of the draft on the path of the task', () async {
    transport.json(200, _task(title: 'Otra', status: 'in_progress'));

    final task = await repository.update(
      _taskId,
      const TaskDraft(title: 'Otra', status: TaskStatus.inProgress),
    );

    expect(task.status, TaskStatus.inProgress);
    final request = transport.requests.single;
    expect(request.uri.path, '/v1/tasks/$_taskId');
    expect(transport.bodyOf(0), {
      'title': 'Otra',
      'description': '',
      'status': 'in_progress',
    });
  });

  test(
    'deletes a task and an unknown one is a TaskNotFoundException',
    () async {
      transport
        ..empty(204)
        ..problem(
          ProblemFixtures.withCode(
            api.TasksErrorCode.taskNotFound.code,
            status: 404,
          ),
        );

      await repository.delete(_taskId);

      expect(transport.requests.single.method, 'DELETE');
      await expectLater(
        repository.delete(_taskId),
        throwsA(isA<TaskNotFoundException>()),
      );
    },
  );

  test('stops emitting changes once disposed', () async {
    final done = repository.changes().isEmpty;

    repository.dispose();

    expect(await done, isTrue);
  });
}
