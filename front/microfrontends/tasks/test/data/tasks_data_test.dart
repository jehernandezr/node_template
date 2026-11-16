import 'package:flutter_test/flutter_test.dart';
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/data/tasks_data.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:shell_core/shell_core.dart';

import '../utils/tasks_app.dart';

void main() {
  group('TasksData', () {
    test('a scope returns the same repository in two calls', () async {
      final scope = TasksTestApp.newScope();
      addTearDown(scope.dispose);

      final first = scope.repository(TasksData.repository);
      final second = scope.repository(TasksData.repository);

      expect(identical(first, second), isTrue);
    });

    test('different scopes do not share tasks', () async {
      final scopeA = TasksTestApp.newScope(userId: 'a');
      final scopeB = TasksTestApp.newScope(userId: 'b');
      addTearDown(scopeA.dispose);
      addTearDown(scopeB.dispose);
      final repositoryA = scopeA.repository(TasksData.repository);
      final repositoryB = scopeB.repository(TasksData.repository);

      await repositoryA.create(const TaskDraft(title: 'Solo de A'));

      final titlesB = (await repositoryB.list()).items.map((t) => t.title);
      expect(titlesB, isNot(contains('Solo de A')));
      final titlesA = (await repositoryA.list()).items.map((t) => t.title);
      expect(titlesA, contains('Solo de A'));
    });

    test('disposing the scope closes the repository', () async {
      final scope = TasksTestApp.newScope();
      final repository = scope.repository(TasksData.repository);
      var done = false;
      repository.changes().listen(null, onDone: () => done = true);

      await scope.dispose();
      await pumpEventQueue();

      expect((repository as FakeTasksRepository).isDisposed, isTrue);
      expect(done, isTrue);
    });
  });
}
