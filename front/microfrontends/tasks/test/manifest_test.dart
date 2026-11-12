import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_tasks/mf_tasks.dart';
import 'package:mf_tasks/src/data/task.dart';
import 'package:mf_tasks/src/data/tasks_repository.dart';
import 'package:mf_tasks/src/screens/screens.dart';
import 'package:shell_core/shell_core.dart';

import 'support.dart';

void main() {
  test('manifest id matches package', () {
    expect(tasksManifest.id, MicrofrontendId.tasks);
  });

  test('every route lives under /tasks', () {
    final paths = _absolutePaths(
      tasksManifest.routes(loadNow, () => newScope()),
    );
    expect(
      paths,
      containsAll(['/tasks', '/tasks/new', '/tasks/:id', '/tasks/:id/edit']),
    );
    for (final path in paths) {
      expect(path, startsWith('/tasks'));
    }
  });

  test('a fresh scope does not see tasks created in another scope', () async {
    final scopeA = newScope(userId: 'a');
    final scopeB = newScope(userId: 'b');
    // The builders create each identity's repository on first use.
    buildTasksListScreen(scopeA);
    buildTasksListScreen(scopeB);

    final repositoryA = scopeA.get<TasksRepository>(
      (services) => throw StateError('repository of scope A should exist'),
    );
    await repositoryA.create(const TaskDraft(title: 'Solo de A'));

    final repositoryB = scopeB.get<TasksRepository>(
      (services) => throw StateError('repository of scope B should exist'),
    );
    final titles = (await repositoryB.list()).items.map((task) => task.title);
    expect(titles, isNot(contains('Solo de A')));
    expect(
      (await repositoryA.list()).items.map((task) => task.title),
      contains('Solo de A'),
    );

    await scopeA.dispose();
    await scopeB.dispose();
  });
}

/// Absolute paths of [routes] and their children. Nested paths are relative.
List<String> _absolutePaths(List<RouteBase> routes, [String parent = '']) => [
  for (final route in routes.whereType<GoRoute>()) ...[
    _join(parent, route.path),
    ..._absolutePaths(route.routes, _join(parent, route.path)),
  ],
];

String _join(String parent, String path) =>
    path.startsWith('/') ? path : '$parent/$path';
