import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_tasks/src/data/fake_tasks_repository.dart';
import 'package:mf_tasks/src/screens/task_detail_view.dart';
import 'package:mf_tasks/src/screens/tasks_list_controller.dart';
import 'package:mf_tasks/src/shared/constants/tasks_demo.dart';
import 'package:mf_tasks/src/shared/constants/tasks_pagination.dart';
import 'package:mf_tasks/src/shared/enums/task_status.dart';
import 'package:mf_tasks/src/shared/types/task.dart';
import 'package:shell_core/shell_core.dart';
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
  testWidgets('shows a loading indicator while tasks load', (tester) async {
    await TasksTestApp.pump(
      tester,
      FakeTasksRepository(
        behavior: DemoBehavior(delay: tasksDemoDelay),
        seed: _seed,
      ),
    );
    // The deferred library loads on a zero-duration timer.
    await tester.pump(const Duration(milliseconds: 1));
    await tester.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pumpAndSettle();
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.text('Pagar factura de luz'), findsOneWidget);
  });

  testWidgets('status filter shows only tasks with that status', (
    tester,
  ) async {
    await TasksTestApp.pump(tester, FakeTasksRepository(seed: _seed));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(ChoiceChip, 'En progreso'));
    await tester.pumpAndSettle();

    expect(find.text('Preparar informe'), findsOneWidget);
    expect(find.text('Pagar factura de luz'), findsNothing);
    expect(find.text('Revisar factura de proveedor'), findsNothing);
  });

  testWidgets('search matches title text', (tester) async {
    await TasksTestApp.pump(tester, FakeTasksRepository(seed: _seed));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, 'factura');
    await tester.pump(TasksListController.searchDebounce);
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
    await TasksTestApp.pump(tester, FakeTasksRepository(seed: seed));
    await tester.pumpAndSettle();

    final loadMore = find.text('Cargar más');
    await TasksTestApp.scrollListTo(tester, loadMore);
    await tester.tap(loadMore);
    await tester.pumpAndSettle();

    expect(find.text('Cargar más'), findsNothing);
    await TasksTestApp.scrollListTo(tester, find.text('Tarea 25'));
    expect(find.text('Tarea 25'), findsOneWidget);
  });

  testWidgets('list refreshes when the repository changes', (tester) async {
    final repository = FakeTasksRepository(seed: _seed);
    await TasksTestApp.pump(tester, repository);
    await tester.pumpAndSettle();
    expect(find.text('Creada desde fuera'), findsNothing);

    // Another screen (here, the test) changes the data.
    final created = repository.create(
      const TaskDraft(title: 'Creada desde fuera'),
    );
    await tester.pumpAndSettle();
    await created;

    expect(find.text('Creada desde fuera'), findsOneWidget);
  });

  testWidgets('strings come from TasksLocalizations', (tester) async {
    await TasksTestApp.pump(
      tester,
      FakeTasksRepository(seed: _seed),
      locale: const Locale('en'),
    );
    await tester.pumpAndSettle();

    expect(find.text('Tasks'), findsOneWidget);
    expect(find.text('New task'), findsOneWidget);
    expect(find.text('Tareas'), findsNothing);
  });

  testWidgets('strings are Spanish with the es locale', (tester) async {
    await TasksTestApp.pump(tester, FakeTasksRepository(seed: _seed));
    await tester.pumpAndSettle();

    expect(find.text('Tareas'), findsOneWidget);
    expect(find.text('Nueva tarea'), findsOneWidget);
  });

  testWidgets('list error labels come from AppLocalizations in en', (
    tester,
  ) async {
    final behavior = DemoBehavior();
    final repository = FakeTasksRepository(behavior: behavior, seed: _seed);
    behavior.failNext(ApiErrorException(ProblemFixtures.unavailable()));
    await TasksTestApp.pump(tester, repository, locale: const Locale('en'));
    await tester.pumpAndSettle();

    expect(find.text('Trace ID: trace-123'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
    expect(find.text('ID de traza: trace-123'), findsNothing);
  });

  testWidgets('without tasksWrite the list hides the create button', (
    tester,
  ) async {
    await TasksTestApp.pump(
      tester,
      FakeTasksRepository(seed: _seed),
      permissions: TasksTestApp.readOnly,
    );
    await tester.pumpAndSettle();

    expect(find.text('Pagar factura de luz'), findsOneWidget);
    expect(find.byType(FloatingActionButton), findsNothing);
  });

  testWidgets('with tasksWrite the list shows the create button', (
    tester,
  ) async {
    await TasksTestApp.pump(tester, FakeTasksRepository(seed: _seed));
    await tester.pumpAndSettle();

    expect(find.byType(FloatingActionButton), findsOneWidget);
  });

  testWidgets('a network failure while loading more frees the list', (
    tester,
  ) async {
    final behavior = DemoBehavior();
    final repository = FakeTasksRepository(
      behavior: behavior,
      seed: [
        for (var i = 0; i < tasksPageSize + 5; i++)
          TaskDraft(
            title: 'Tarea $i',
            description: '',
            status: TaskStatus.open,
          ),
      ],
    );
    await TasksTestApp.pump(tester, repository);
    await tester.pumpAndSettle();

    final loadMore = find.text('Cargar más');
    await TasksTestApp.scrollListTo(tester, loadMore);
    behavior.failNext(const FakeFailure());
    await tester.tap(loadMore);
    await tester.pumpAndSettle();

    expect(find.byType(SnackBar), findsOneWidget);
    // The button is back: the list is not stuck loading.
    expect(find.text('Cargar más'), findsOneWidget);
  });

  testWidgets('an empty repository shows the empty state', (tester) async {
    await TasksTestApp.pump(tester, FakeTasksRepository(seed: const []));
    await tester.pumpAndSettle();

    expect(find.text('No hay tareas'), findsOneWidget);
    expect(find.text('Crea una tarea para empezar.'), findsOneWidget);
  });

  testWidgets('a search without matches shows its own empty state', (
    tester,
  ) async {
    await TasksTestApp.pump(tester, FakeTasksRepository(seed: _seed));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, 'inexistente');
    await tester.pump(TasksListController.searchDebounce);
    await tester.pumpAndSettle();

    expect(find.text('Sin resultados'), findsOneWidget);
    expect(find.text('No hay tareas'), findsNothing);
  });

  group('expanded width', () {
    Future<void> pumpWide(WidgetTester tester, FakeTasksRepository repo) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1280, 800);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await TasksTestApp.pump(tester, repo);
      await tester.pumpAndSettle();
    }

    testWidgets('a tap shows the task beside the list and keeps the route', (
      tester,
    ) async {
      await pumpWide(tester, FakeTasksRepository(seed: _seed));
      expect(
        find.text('Selecciona una tarea para verla aquí.'),
        findsOneWidget,
      );

      await tester.tap(find.text('Preparar informe'));
      await tester.pumpAndSettle();

      expect(find.byType(TaskDetailView), findsOneWidget);
      expect(find.text('Trimestre actual'), findsOneWidget);
      expect(
        tester
            .widget<ListTile>(find.widgetWithText(ListTile, 'Preparar informe'))
            .selected,
        isTrue,
      );
    });

    testWidgets('deleting the selected task clears the side pane', (
      tester,
    ) async {
      await pumpWide(tester, FakeTasksRepository(seed: _seed));
      await tester.tap(find.text('Preparar informe'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Eliminar'));
      await tester.pumpAndSettle();
      await tester.tap(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.text('Eliminar'),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(TaskDetailView), findsNothing);
      expect(
        find.text('Selecciona una tarea para verla aquí.'),
        findsOneWidget,
      );
      expect(find.text('Preparar informe'), findsNothing);
    });
  });

  testWidgets('the list meets the accessibility guidelines', (tester) async {
    await TasksTestApp.pump(tester, FakeTasksRepository(seed: _seed));
    await tester.pumpAndSettle();

    await expectAccessible(tester);
  });
}
