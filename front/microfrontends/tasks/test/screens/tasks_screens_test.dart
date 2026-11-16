import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/screens/task_form_screen.dart';
import 'package:mf_tasks/src/shared/enums/task_status.dart';
import 'package:mf_tasks/src/shared/types/task.dart';

import '../utils/tasks_app.dart';

const _seed = [
  TaskDraft(title: 'Pagar factura de luz'),
  TaskDraft(title: 'Preparar informe', status: TaskStatus.inProgress),
];

void main() {
  testWidgets('a direct link to /tasks/new without tasksWrite is forbidden', (
    tester,
  ) async {
    await TasksTestApp.pump(
      tester,
      FakeTasksRepository(seed: _seed),
      location: '/tasks/new',
      permissions: TasksTestApp.readOnly,
    );
    await tester.pumpAndSettle();

    expect(find.text(TasksTestApp.forbiddenText), findsOneWidget);
    expect(find.byType(TaskFormScreen), findsNothing);
    expect(find.byType(TextFormField), findsNothing);
    expect(find.byType(FloatingActionButton), findsNothing);
  });

  testWidgets(
    'a direct link to /tasks/:id/edit without tasksWrite is forbidden',
    (tester) async {
      final repository = FakeTasksRepository(seed: _seed);
      final id = await TasksTestApp.firstId(tester, repository);
      await TasksTestApp.pump(
        tester,
        repository,
        location: '/tasks/$id/edit',
        permissions: TasksTestApp.readOnly,
      );
      await tester.pumpAndSettle();

      expect(find.text(TasksTestApp.forbiddenText), findsOneWidget);
      expect(find.byType(TaskFormScreen), findsNothing);
    },
  );
}
