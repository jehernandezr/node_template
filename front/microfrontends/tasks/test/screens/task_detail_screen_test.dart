import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/screens/task_detail_screen.dart';
import 'package:mf_tasks/src/screens/tasks_list_screen.dart';
import 'package:mf_tasks/src/shared/enums/task_status.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/tasks_app.dart';

const _seed = [
  TaskDraft(title: 'Pagar factura de luz'),
  TaskDraft(
    title: 'Preparar informe',
    description: 'Trimestre actual',
    status: TaskStatus.inProgress,
  ),
  TaskDraft(title: 'Revisar factura de proveedor', status: TaskStatus.done),
];

void main() {
  testWidgets('deep link to a task has a back button', (tester) async {
    final repository = FakeTasksRepository(seed: _seed);
    final id = await TasksTestApp.firstId(tester, repository);
    await TasksTestApp.pump(tester, repository, location: '/tasks/$id');
    await tester.pumpAndSettle();

    expect(find.byType(TaskDetailScreen), findsOneWidget);
    expect(find.byType(BackButton), findsOneWidget);

    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();

    expect(find.byType(TaskDetailScreen), findsNothing);
    expect(find.byType(TasksListScreen), findsOneWidget);
  });

  testWidgets('delete asks for confirmation before removing the task', (
    tester,
  ) async {
    final repository = FakeTasksRepository(seed: _seed);
    final id = await TasksTestApp.firstId(tester, repository);
    await TasksTestApp.pump(tester, repository, location: '/tasks/$id');
    await tester.pumpAndSettle();
    expect(find.text('Pagar factura de luz'), findsOneWidget);

    await tester.tap(find.text('Eliminar'));
    await tester.pumpAndSettle();
    expect(find.text('¿Eliminar tarea?'), findsOneWidget);

    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Cancelar'),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.byType(AlertDialog), findsNothing);
    expect(
      (await tester.runAsync(() => repository.get(id)))?.title,
      'Pagar factura de luz',
    );

    await tester.tap(find.text('Eliminar'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Eliminar'),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(TasksListScreen), findsOneWidget);
    expect(find.text('Pagar factura de luz'), findsNothing);
    final remaining = (await tester.runAsync(() => repository.list()))!;
    expect(remaining.items.map((task) => task.id), isNot(contains(id)));
  });

  testWidgets('the delete dialog uses the tasks texts', (tester) async {
    final repository = FakeTasksRepository(seed: _seed);
    final id = await TasksTestApp.firstId(tester, repository);
    await TasksTestApp.pump(tester, repository, location: '/tasks/$id');
    await tester.pumpAndSettle();

    await tester.tap(find.text('Eliminar'));
    await tester.pumpAndSettle();

    final dialog = find.byType(AlertDialog);
    expect(
      find.descendant(of: dialog, matching: find.text('¿Eliminar tarea?')),
      findsOneWidget,
    );
    expect(
      find.descendant(
        of: dialog,
        matching: find.text('Esta acción no se puede deshacer.'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('without tasksWrite the detail hides edit and delete', (
    tester,
  ) async {
    final repository = FakeTasksRepository(seed: _seed);
    final id = await TasksTestApp.firstId(tester, repository);
    await TasksTestApp.pump(
      tester,
      repository,
      location: '/tasks/$id',
      permissions: TasksTestApp.readOnly,
    );
    await tester.pumpAndSettle();

    expect(find.text('Pagar factura de luz'), findsOneWidget);
    expect(find.text('Editar'), findsNothing);
    expect(find.text('Eliminar'), findsNothing);
  });

  testWidgets('detail of an unknown task shows not found without retry', (
    tester,
  ) async {
    await TasksTestApp.pump(
      tester,
      FakeTasksRepository(seed: _seed),
      location: '/tasks/does-not-exist',
    );
    await tester.pumpAndSettle();

    expect(find.text('La tarea no existe.'), findsOneWidget);
    expect(find.text('Reintentar'), findsNothing);
  });

  testWidgets('the detail meets the accessibility guidelines', (tester) async {
    final repository = FakeTasksRepository(seed: _seed);
    final id = await TasksTestApp.firstId(tester, repository);
    await TasksTestApp.pump(tester, repository, location: '/tasks/$id');
    await tester.pumpAndSettle();

    await expectAccessible(tester);
  });
}
