import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_tasks/mf_tasks.dart';
import 'package:mf_tasks/src/data/tasks_repository.dart';
import 'package:mf_tasks/src/screens/screens.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:shell_core/shell_core.dart';

import 'support.dart';

void main() {
  test('manifest id matches package', () {
    expect(tasksManifest.id, MicrofrontendId.tasks);
  });

  test('every route lives under /tasks', () {
    final paths = _absolutePaths(
      tasksManifest.buildRoutes(loadNow, () => newScope()),
    );
    expect(
      paths,
      containsAll(['/tasks', '/tasks/new', '/tasks/:id', '/tasks/:id/edit']),
    );
    for (final path in paths) {
      expect(path, startsWith('/tasks'));
    }
  });

  test('declares screens and no legacy routes or lifecycle', () {
    expect(tasksManifest.screens, hasLength(1));
    expect(tasksManifest.lifecycle, isNull);
    expect(
      tasksManifest.routes(loadNow, () => newScope()),
      isEmpty,
      reason: 'legacy routes are not used',
    );
  });

  test('only the write routes carry the tasksWrite rule', () {
    final access = _accessByPath(tasksManifest.screens);
    expect(access['/tasks'], isNull);
    expect(access['/tasks/:id'], isNull);

    final readOnly = UserSession(
      userId: 'u',
      tenantId: 't',
      permissions: {Permission.tasksRead},
    );
    final writer = UserSession(
      userId: 'u',
      tenantId: 't',
      permissions: {Permission.tasksRead, Permission.tasksWrite},
    );
    for (final path in ['/tasks/new', '/tasks/:id/edit']) {
      final rule = access[path];
      expect(rule, isNotNull, reason: path);
      expect(rule!.allows(readOnly), isFalse, reason: path);
      expect(rule.allows(writer), isTrue, reason: path);
    }
  });

  test('the manifest requires tasksRead', () {
    final none = UserSession(userId: 'u', tenantId: 't');
    final reader = UserSession(
      userId: 'u',
      tenantId: 't',
      permissions: {Permission.tasksRead},
    );
    expect(tasksManifest.access.allows(none), isFalse);
    expect(tasksManifest.access.allows(reader), isTrue);
  });

  test('the manifest does not import data, screens or l10n eagerly', () {
    final root = Directory('lib');
    final pending = [File('lib/mf_tasks.dart')];
    final seen = <String>{};
    while (pending.isNotEmpty) {
      final file = pending.removeLast();
      if (!seen.add(file.path)) continue;
      for (final uri in _eagerImports(file.readAsStringSync())) {
        if (uri.startsWith('package:mf_tasks/')) {
          pending.add(File('lib/${uri.substring('package:mf_tasks/'.length)}'));
        } else if (!uri.contains(':')) {
          pending.add(File.fromUri(file.uri.resolve(uri)));
        }
      }
    }
    expect(root.existsSync(), isTrue);
    expect(seen, contains('lib/mf_tasks.dart'));
    for (final path in seen) {
      for (final forbidden in ['/data/', '/screens/', '/l10n/']) {
        expect(path, isNot(contains(forbidden)), reason: path);
      }
    }
  });

  test('screens are imported as deferred', () {
    final source = File('lib/mf_tasks.dart').readAsStringSync();
    expect(source, contains("screens.dart' deferred as screens"));
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

  test('disposing the scope disposes the repository', () async {
    final scope = newScope();
    buildTasksListScreen(scope);
    final repository = scope.get<TasksRepository>(
      (services) => throw StateError('repository should exist'),
    );
    var done = false;
    repository.changes().listen(null, onDone: () => done = true);

    await scope.dispose();
    await Future<void>.delayed(Duration.zero);

    expect(done, isTrue);
  });
}

/// URIs of the imports and exports of [source] that are not deferred.
Iterable<String> _eagerImports(String source) sync* {
  final directive = RegExp(
    r'''^\s*(?:import|export)\s+['"]([^'"]+)['"]([^;]*);''',
    multiLine: true,
  );
  for (final match in directive.allMatches(source)) {
    if ((match.group(2) ?? '').contains('deferred')) continue;
    yield match.group(1)!;
  }
}

/// Absolute paths of [routes] and their children. Nested paths are relative.
List<String> _absolutePaths(List<RouteBase> routes, [String parent = '']) => [
  for (final route in routes.whereType<GoRoute>()) ...[
    _join(parent, route.path),
    ..._absolutePaths(route.routes, _join(parent, route.path)),
  ],
];

/// Access rule of each screen by absolute path.
Map<String, AccessRule?> _accessByPath(
  List<ScreenRoute> screens, [
  String parent = '',
]) => {
  for (final screen in screens) ...{
    _join(parent, screen.path): screen.access,
    ..._accessByPath(screen.routes, _join(parent, screen.path)),
  },
};

String _join(String parent, String path) =>
    path.startsWith('/') ? path : '$parent/$path';
