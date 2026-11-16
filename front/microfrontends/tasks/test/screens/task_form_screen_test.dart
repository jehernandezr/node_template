import 'package:contracts/contracts.dart' hide TaskStatus;
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/screens/task_form_screen.dart';
import 'package:mf_tasks/src/screens/tasks_list_screen.dart';
import 'package:mf_tasks/src/shared/enums/task_status.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

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
  testWidgets('create flow saves the task and returns to the list', (
    tester,
  ) async {
    await TasksTestApp.pump(tester, FakeTasksRepository(seed: _seed));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(FloatingActionButton, 'Nueva tarea'));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byType(TextFormField).first,
      'Llamar al contador',
    );
    await tester.tap(find.text('Guardar'));
    await tester.pumpAndSettle();

    expect(find.byType(TasksListScreen), findsOneWidget);
    expect(find.text('Guardar'), findsNothing);
    expect(find.text('Llamar al contador'), findsOneWidget);
  });

  testWidgets('empty title shows a validation message', (tester) async {
    await TasksTestApp.pump(
      tester,
      FakeTasksRepository(seed: _seed),
      location: '/tasks/new',
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Guardar'));
    await tester.pumpAndSettle();

    expect(find.text('Escribe un título.'), findsOneWidget);
    expect(find.byType(TaskFormScreen), findsOneWidget);
  });

  testWidgets('form retry runs the failed load again', (tester) async {
    final behavior = DemoBehavior();
    final repository = FakeTasksRepository(behavior: behavior, seed: _seed);
    final id = await TasksTestApp.firstId(tester, repository);
    await TasksTestApp.pump(tester, repository, location: '/tasks/$id');
    await tester.pumpAndSettle();

    // The next call fails: the load of the edit form.
    behavior.failNext(ApiErrorException(ProblemFixtures.unavailable()));
    await tester.tap(find.text('Editar'));
    await tester.pumpAndSettle();

    expect(find.text('No se pudo cargar la tarea.'), findsOneWidget);
    expect(find.text('ID de traza: trace-123'), findsOneWidget);

    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();

    expect(find.text('No se pudo cargar la tarea.'), findsNothing);
    final title = tester.widget<TextFormField>(
      find.byType(TextFormField).first,
    );
    expect(title.controller!.text, 'Pagar factura de luz');
  });

  testWidgets('with tasksWrite /tasks/new shows the form', (tester) async {
    await TasksTestApp.pump(
      tester,
      FakeTasksRepository(seed: _seed),
      location: '/tasks/new',
    );
    await tester.pumpAndSettle();

    expect(find.byType(TaskFormScreen), findsOneWidget);
    expect(find.text(TasksTestApp.forbiddenText), findsNothing);
  });

  testWidgets('a failed save shows the error and keeps the form', (
    tester,
  ) async {
    final behavior = DemoBehavior();
    final repository = FakeTasksRepository(behavior: behavior, seed: _seed);
    await TasksTestApp.pump(tester, repository, location: '/tasks/new');
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).first, 'Nueva');
    behavior.failNext(ApiErrorException(ProblemFixtures.unavailable()));
    await tester.tap(find.text('Guardar'));
    await tester.pumpAndSettle();

    expect(find.byType(TaskFormScreen), findsOneWidget);
    expect(find.byType(SnackBar), findsOneWidget);
  });

  testWidgets('the typed text survives a failed save', (tester) async {
    final behavior = DemoBehavior();
    final repository = FakeTasksRepository(behavior: behavior, seed: _seed);
    await TasksTestApp.pump(tester, repository, location: '/tasks/new');
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).first, 'Nueva');
    behavior.failNext(const FakeFailure());
    await tester.tap(find.text('Guardar'));
    await tester.pumpAndSettle();

    final title = tester.widget<TextFormField>(
      find.byType(TextFormField).first,
    );
    expect(title.controller!.text, 'Nueva');
  });

  testWidgets(
    'a contract violation on save shows the field error and frees the button',
    (tester) async {
      final behavior = DemoBehavior();
      final repository = FakeTasksRepository(behavior: behavior, seed: _seed);
      await TasksTestApp.pump(tester, repository, location: '/tasks/new');
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, 'Nueva');
      behavior.failNext(
        ContractViolationException(
          routeId: 'tasks.create',
          errors: [
            FieldError(
              field: 'title',
              code: PlatformErrorCode.validationTooLong.code,
            ),
          ],
        ),
      );
      await tester.tap(find.text('Guardar'));
      await tester.pumpAndSettle();

      expect(find.byType(TaskFormScreen), findsOneWidget);
      expect(find.text('El valor es demasiado largo.'), findsOneWidget);
      final button = tester.widget<AppButton>(find.byType(AppButton));
      expect(button.loading, isFalse);
    },
  );

  testWidgets('the form meets the accessibility guidelines', (tester) async {
    await TasksTestApp.pump(
      tester,
      FakeTasksRepository(seed: _seed),
      location: '/tasks/new',
    );
    await tester.pumpAndSettle();

    await expectAccessible(tester);
  });
}
