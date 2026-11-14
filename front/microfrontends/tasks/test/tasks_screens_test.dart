import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/data/tasks_repository.dart';
import 'package:mf_tasks/src/screens/screens.dart';
import 'package:mf_tasks/src/shared/constants/tasks_pagination.dart';
import 'package:mf_tasks/src/shared/enums/task_status.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:ui/ui.dart';

import 'support.dart';

const _seed = [
  TaskDraft(title: 'Pagar factura de luz'),
  TaskDraft(
    title: 'Preparar informe',
    description: 'Trimestre actual',
    status: TaskStatus.inProgress,
  ),
  TaskDraft(title: 'Revisar factura de proveedor', status: TaskStatus.done),
];

Future<void> pumpTasks(
  WidgetTester tester,
  TasksRepository repository, {
  String location = '/tasks',
  Locale locale = const Locale('es'),
  Set<Permission> permissions = readWrite,
}) => tester.pumpWidget(
  tasksApp(
    scope: scopeWith(repository),
    location: location,
    locale: locale,
    permissions: permissions,
  ),
);

/// Id of the first task of [repository], which is the first seed task.
Future<String> firstId(WidgetTester tester, TasksRepository repository) async =>
    (await tester.runAsync(() => repository.list()))!.items.first.id;

/// Scrolls the task list until [finder] is on screen.
Future<void> scrollListTo(WidgetTester tester, Finder finder) =>
    tester.scrollUntilVisible(
      finder,
      300,
      scrollable: find.descendant(
        of: find.byType(ListView),
        matching: find.byType(Scrollable),
      ),
    );

void main() {
  testWidgets('shows a loading indicator while tasks load', (tester) async {
    await pumpTasks(tester, FakeTasksRepository(seed: _seed));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpAndSettle();
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.text('Pagar factura de luz'), findsOneWidget);
  });

  testWidgets('status filter shows only tasks with that status', (
    tester,
  ) async {
    await pumpTasks(
      tester,
      FakeTasksRepository(delay: Duration.zero, seed: _seed),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(ChoiceChip, 'En progreso'));
    await tester.pumpAndSettle();

    expect(find.text('Preparar informe'), findsOneWidget);
    expect(find.text('Pagar factura de luz'), findsNothing);
    expect(find.text('Revisar factura de proveedor'), findsNothing);
  });

  testWidgets('search matches title text', (tester) async {
    await pumpTasks(
      tester,
      FakeTasksRepository(delay: Duration.zero, seed: _seed),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, 'factura');
    await tester.pumpAndSettle();

    expect(find.text('Pagar factura de luz'), findsOneWidget);
    expect(find.text('Revisar factura de proveedor'), findsOneWidget);
    expect(find.text('Preparar informe'), findsNothing);
  });

  testWidgets('load more appends the next page', (tester) async {
    final seed = [
      for (var i = 1; i <= 25; i++)
        TaskDraft(title: 'Tarea ${i.toString().padLeft(2, '0')}'),
    ];
    await pumpTasks(
      tester,
      FakeTasksRepository(delay: Duration.zero, seed: seed),
    );
    await tester.pumpAndSettle();

    final loadMore = find.text('Cargar más');
    await scrollListTo(tester, loadMore);
    await tester.tap(loadMore);
    await tester.pumpAndSettle();

    expect(find.text('Cargar más'), findsNothing);
    await scrollListTo(tester, find.text('Tarea 25'));
    expect(find.text('Tarea 25'), findsOneWidget);
  });

  testWidgets('create flow saves the task and returns to the list', (
    tester,
  ) async {
    await pumpTasks(
      tester,
      FakeTasksRepository(delay: Duration.zero, seed: _seed),
    );
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
    await pumpTasks(
      tester,
      FakeTasksRepository(delay: Duration.zero, seed: _seed),
      location: '/tasks/new',
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Guardar'));
    await tester.pumpAndSettle();

    expect(find.text('Escribe un título.'), findsOneWidget);
    expect(find.byType(TaskFormScreen), findsOneWidget);
  });

  testWidgets('form retry runs the failed load again', (tester) async {
    final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    final id = await firstId(tester, repository);
    await pumpTasks(tester, repository, location: '/tasks/$id');
    await tester.pumpAndSettle();

    // The next call fails: the load of the edit form.
    repository.failNext(const ApiErrorException(unavailableProblem));
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

  testWidgets('deep link to a task has a back button', (tester) async {
    final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    final id = await firstId(tester, repository);
    await pumpTasks(tester, repository, location: '/tasks/$id');
    await tester.pumpAndSettle();

    expect(find.byType(TaskDetailScreen), findsOneWidget);
    expect(find.byType(BackButton), findsOneWidget);

    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();

    expect(find.byType(TaskDetailScreen), findsNothing);
    expect(find.byType(TasksListScreen), findsOneWidget);
  });

  testWidgets('list refreshes when the repository changes', (tester) async {
    final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    await pumpTasks(tester, repository);
    await tester.pumpAndSettle();
    expect(find.text('Creada desde fuera'), findsNothing);

    // Another screen (here, the test) changes the data.
    await tester.runAsync(() async {
      await repository.create(const TaskDraft(title: 'Creada desde fuera'));
      await Future<void>.delayed(const Duration(milliseconds: 20));
    });
    await tester.pumpAndSettle();

    expect(find.text('Creada desde fuera'), findsOneWidget);
  });

  testWidgets('strings come from TasksLocalizations', (tester) async {
    final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    await pumpTasks(tester, repository, locale: const Locale('en'));
    await tester.pumpAndSettle();

    expect(find.text('Tasks'), findsOneWidget);
    expect(find.text('New task'), findsOneWidget);
    expect(find.text('Tareas'), findsNothing);
  });

  testWidgets('strings are Spanish with the es locale', (tester) async {
    final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    await pumpTasks(tester, repository);
    await tester.pumpAndSettle();

    expect(find.text('Tareas'), findsOneWidget);
    expect(find.text('Nueva tarea'), findsOneWidget);
  });

  testWidgets('delete asks for confirmation before removing the task', (
    tester,
  ) async {
    final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    final id = await firstId(tester, repository);
    await pumpTasks(tester, repository, location: '/tasks/$id');
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
  testWidgets('list error labels come from AppLocalizations in en', (
    tester,
  ) async {
    final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    repository.failNext(const ApiErrorException(unavailableProblem));
    await pumpTasks(tester, repository, locale: const Locale('en'));
    await tester.pumpAndSettle();

    expect(find.text('Trace ID: trace-123'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
    expect(find.text('ID de traza: trace-123'), findsNothing);
  });

  testWidgets('without tasksWrite the list hides the create button', (
    tester,
  ) async {
    await pumpTasks(
      tester,
      FakeTasksRepository(delay: Duration.zero, seed: _seed),
      permissions: readOnly,
    );
    await tester.pumpAndSettle();

    expect(find.text('Pagar factura de luz'), findsOneWidget);
    expect(find.byType(FloatingActionButton), findsNothing);
  });

  testWidgets('with tasksWrite the list shows the create button', (
    tester,
  ) async {
    await pumpTasks(
      tester,
      FakeTasksRepository(delay: Duration.zero, seed: _seed),
    );
    await tester.pumpAndSettle();

    expect(find.byType(FloatingActionButton), findsOneWidget);
  });

  testWidgets('without tasksWrite the detail hides edit and delete', (
    tester,
  ) async {
    final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    final id = await firstId(tester, repository);
    await pumpTasks(
      tester,
      repository,
      location: '/tasks/$id',
      permissions: readOnly,
    );
    await tester.pumpAndSettle();

    expect(find.text('Pagar factura de luz'), findsOneWidget);
    expect(find.text('Editar'), findsNothing);
    expect(find.text('Eliminar'), findsNothing);
  });

  testWidgets('a direct link to /tasks/new without tasksWrite is forbidden', (
    tester,
  ) async {
    await pumpTasks(
      tester,
      FakeTasksRepository(delay: Duration.zero, seed: _seed),
      location: '/tasks/new',
      permissions: readOnly,
    );
    await tester.pumpAndSettle();

    expect(find.text(forbiddenText), findsOneWidget);
    expect(find.byType(TaskFormScreen), findsNothing);
    expect(find.byType(TextFormField), findsNothing);
    expect(find.byType(FloatingActionButton), findsNothing);
  });

  testWidgets('a direct link to /tasks/:id/edit without tasksWrite is '
      'forbidden', (tester) async {
    final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    final id = await firstId(tester, repository);
    await pumpTasks(
      tester,
      repository,
      location: '/tasks/$id/edit',
      permissions: readOnly,
    );
    await tester.pumpAndSettle();

    expect(find.text(forbiddenText), findsOneWidget);
    expect(find.byType(TaskFormScreen), findsNothing);
  });

  testWidgets('with tasksWrite /tasks/new shows the form', (tester) async {
    await pumpTasks(
      tester,
      FakeTasksRepository(delay: Duration.zero, seed: _seed),
      location: '/tasks/new',
    );
    await tester.pumpAndSettle();

    expect(find.byType(TaskFormScreen), findsOneWidget);
    expect(find.text(forbiddenText), findsNothing);
  });

  testWidgets('detail of an unknown task shows not found without retry', (
    tester,
  ) async {
    await pumpTasks(
      tester,
      FakeTasksRepository(delay: Duration.zero, seed: _seed),
      location: '/tasks/does-not-exist',
    );
    await tester.pumpAndSettle();

    expect(find.text('La tarea no existe.'), findsOneWidget);
    expect(find.text('Reintentar'), findsNothing);
  });

  testWidgets('a failed save shows the error and keeps the form', (
    tester,
  ) async {
    final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
    await pumpTasks(tester, repository, location: '/tasks/new');
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextFormField).first, 'Nueva');
    repository.failNext(const ApiErrorException(unavailableProblem));
    await tester.tap(find.text('Guardar'));
    await tester.pumpAndSettle();

    expect(find.byType(TaskFormScreen), findsOneWidget);
    expect(find.byType(SnackBar), findsOneWidget);
  });

  testWidgets(
    'a contract violation on save shows the field error and frees the button',
    (tester) async {
      final repository = FakeTasksRepository(delay: Duration.zero, seed: _seed);
      await pumpTasks(tester, repository, location: '/tasks/new');
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextFormField).first, 'Nueva');
      repository.failNext(
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

  testWidgets('a network failure while loading more frees the list', (
    tester,
  ) async {
    final repository = FakeTasksRepository(
      delay: Duration.zero,
      seed: [
        for (var i = 0; i < tasksPageSize + 5; i++)
          TaskDraft(
            title: 'Tarea $i',
            description: '',
            status: TaskStatus.open,
          ),
      ],
    );
    await pumpTasks(tester, repository);
    await tester.pumpAndSettle();

    final loadMore = find.text('Cargar más');
    await scrollListTo(tester, loadMore);
    repository.failNext(const SocketLikeException());
    await tester.tap(loadMore);
    await tester.pumpAndSettle();

    expect(find.byType(SnackBar), findsOneWidget);
    // The button is back: the list is not stuck loading.
    expect(find.text('Cargar más'), findsOneWidget);
  });
}

/// Stand-in for the transport's network error.
final class SocketLikeException implements Exception {
  const SocketLikeException();
}
