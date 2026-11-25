# Widget tests

## Contents

- `TestApp` and the per-microfrontend harness
- The four states of a screen
- Compact and expanded layout
- Accessibility
- Text scale
- Golden tests
- Deferred libraries in tests
- Controller without widgets, with a gate

## `TestApp`

`TestApp` from `test_utils` builds a `MaterialApp` with the theme, the shared delegates, the session and the clock. No test builds its own `MaterialApp`. Its methods:

- `wrap(home)`: an app whose home is `home`. It adds no `Scaffold`; the screen brings its own if it needs one.
- `wrapRouter(router)`: the same app on a test `GoRouter`, to test routes and guards.
- `pump(tester, home)`: `tester.pumpWidget(wrap(home))`.

`delegates` adds those of the microfrontend under test, such as `TasksLocalizations.delegate`. `session` is the session `context.can` sees; without a value, a session from `SessionBuilder()`.

```dart
await TestApp(
  delegates: const [TasksLocalizations.delegate],
  session: SessionBuilder().withPermissions({Permission.tasksRead}).build(),
).pump(tester, TasksListScreen(repository: repository));
```

`SessionBuilder` builds the session: `withPermissions`, `withRoles`, `withFeatures`, `withFlags`, `mfaVerifiedAt(at)` and `SessionBuilder.anonymous()`. `ProblemFixtures` provides ready-made contract problems: `unavailable()`, `forbidden()`, `notFound()` and `withCode(code, status:)`.

Every microfrontend with several screens has a small harness, shaped like `TasksTestApp` in `test/utils/tasks_app.dart`. It mounts the manifest's real routes on `TestApp.wrapRouter`, with a test route for the access denied page:

```dart
final class TasksTestApp {
  const TasksTestApp({this.permissions = readWrite});

  static const Set<Permission> readWrite = {Permission.tasksRead, Permission.tasksWrite};

  final Set<Permission> permissions;

  Widget wrap(MicrofrontendScope scope, {String location = TasksPaths.list}) {
    final router = GoRouter(
      initialLocation: location,
      routes: [
        ...tasksManifest.buildRoutes(DeferredLibraryLoader().page, () => scope),
        GoRoute(path: '/forbidden', builder: (_, _) => const Text('forbidden-page')),
      ],
    );
    return TestApp(
      session: SessionBuilder().withPermissions(permissions).build(),
    ).wrapRouter(router);
  }
}
```

## The four states of a screen

Each state is tested with a repository double, not with the state forced by hand. `FakeTasksRepository` receives a `DemoBehavior` (latency and failures) and a `seed` (data):

```dart
testWidgets('shows the empty state when there are no tasks', (tester) async {
  final repository = FakeTasksRepository(
    behavior: DemoBehavior(),
    seed: const [],
  );
  addTearDown(repository.dispose);

  await TestApp(delegates: const [TasksLocalizations.delegate])
      .pump(tester, TasksListScreen(repository: repository));
  await tester.pumpAndSettle();

  expect(find.text('No hay tareas'), findsOneWidget);
});

testWidgets('shows the error state and retries', (tester) async {
  final behavior = DemoBehavior()
    ..failNext(const FakeFailure(), operation: TasksOperation.list);
  final repository = FakeTasksRepository(behavior: behavior);
  addTearDown(repository.dispose);

  await TestApp(delegates: const [TasksLocalizations.delegate])
      .pump(tester, TasksListScreen(repository: repository));
  await tester.pumpAndSettle();

  expect(find.byType(ErrorView), findsOneWidget);
  await tester.tap(find.text('Reintentar'));
  await tester.pumpAndSettle();
  expect(find.byType(ErrorView), findsNothing);
});
```

The loading state is checked with the first `pump` and `find.byType(LoadingView)`. With a delay, `DemoBehavior(delay: ...)` keeps the load in progress until time is advanced. For a state that lasts as long as the test decides, use a repository with a `Completer` (see the last section).

## Compact and expanded layout

`pumpAtWidths` renders the same screen at each width (320, 800 and 1280 by default) and calls `check` with the width. It restores the surface when done. `home` brings its own app, so the width reaches the screen's layout:

```dart
testWidgets('the list keeps its controls at every width', (tester) async {
  final repository = FakeTasksRepository(behavior: DemoBehavior(), seed: _seed);
  addTearDown(repository.dispose);

  await pumpAtWidths(
    tester,
    TestApp(delegates: const [TasksLocalizations.delegate])
        .wrap(TasksListScreen(repository: repository)),
    check: (width) async {
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull, reason: 'width $width');
    },
  );
});
```

If a narrow width throws an overflow, the test fails, and that is correct.

## Accessibility

`expectAccessible(tester)` from `test_utils` runs the four `flutter_test` guidelines (tap target size on Android and iOS, control labels and text contrast) and releases the semantics handle even if a guideline fails:

```dart
testWidgets('the task form meets accessibility guidelines', (tester) async {
  final repository = FakeTasksRepository(behavior: DemoBehavior(), seed: _seed);
  addTearDown(repository.dispose);

  await TestApp(delegates: const [TasksLocalizations.delegate])
      .pump(tester, TaskFormScreen(repository: repository));
  await tester.pumpAndSettle();

  await expectAccessible(tester);
});
```

For a control with a specific accessible name: `expect(tester.getSemantics(find.byIcon(Icons.close)), matchesSemantics(label: 'Cerrar', isButton: true, hasTapAction: true, isEnabled: true, hasEnabledState: true, isFocusable: true));`.

## Text scale

`pumpAtTextScale(tester, home)` sets the scale to 2.0 and restores it when done. The `home` brings its app, as in `pumpAtWidths`:

```dart
testWidgets('the list survives 2x text scale', (tester) async {
  final repository = FakeTasksRepository(behavior: DemoBehavior(), seed: _seed);
  addTearDown(repository.dispose);

  await pumpAtTextScale(
    tester,
    TestApp(delegates: const [TasksLocalizations.delegate])
        .wrap(TasksListScreen(repository: repository)),
  );
  await tester.pumpAndSettle();

  expect(tester.takeException(), isNull);
});
```

## Golden tests

Only in `packages/ui` and only for stable visual components (buttons, cards, state views), with `flutter_test` and no extra libraries. They are tagged to run separately, because rendering varies between operating systems and they are generated and compared in a single environment (CI).

```dart
@Tags(['golden'])
library;

testWidgets('EmptyState matches golden', (tester) async {
  await TestApp().pump(
    tester,
    const EmptyState(icon: Icons.inbox, title: 'Sin datos'),
  );

  await expectLater(
    find.byType(EmptyState),
    matchesGoldenFile('goldens/empty_state.png'),
  );
});
```

Rules: a golden measures appearance, not behavior; a widget with dynamic data receives fixed data; the PNGs live next to the test in `test/<folder>/goldens/`; they are updated with `flutter test --update-goldens --tags golden` and the diff is reviewed by eye in the PR. The tag is declared in the package's `dart_test.yaml` (`tags: {golden: {}}`).

## Deferred libraries in tests

A test that opens a deferred screen needs its library loaded. `DeferredLibrariesPreloader` loads it in `setUpAll`, outside `testWidgets`, because the VM keeps a single load per deferred unit, bound to the zone of the first test that requested it. It receives the manifests and loads their screens and the lifecycles that start with them:

```dart
setUpAll(() => const DeferredLibrariesPreloader().load([tasksManifest]));
```

## Controller without widgets, with a gate

To test that an old response does not overwrite a new one, the double exposes one `Completer` per call. `ScriptedTasksRepository` in `tasks` is the full form:

```dart
final class ScriptedTasksRepository implements TasksRepository {
  final List<Completer<Task>> gets = [];

  @override
  Future<Task> get(String id) {
    final completer = Completer<Task>();
    gets.add(completer);
    return completer.future;
  }
  // ...rest of the port
}
```

The test starts two loads, completes the second and then the first with `await pumpEventQueue()` in between, and checks that the final state is the second one:

```dart
test('an older answer does not replace a newer one', () async {
  final controller = TaskDetailController(repository, taskId: 'a');
  addTearDown(controller.dispose);

  unawaited(controller.start());
  unawaited(controller.start());
  repository.gets[1].complete(_taskB);
  await pumpEventQueue();
  repository.gets[0].complete(_taskA);
  await pumpEventQueue();

  final state = controller.state as TaskDetailShowing;
  expect(state.task.valueOrNull?.title, 'Tarea B');
});
```
