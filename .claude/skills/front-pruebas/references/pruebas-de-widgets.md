# Pruebas de widgets

## Contenido

- `TestApp` y el arnés por microfrontend
- Los cuatro estados de una pantalla
- Layout compacto y expandido
- Accesibilidad
- Escala de texto
- Golden tests
- Controlador sin widgets, con compuerta

## `TestApp`

`TestApp` de `test_utils` arma un `MaterialApp` con el tema, los delegados compartidos, la sesión y el reloj. Ninguna prueba arma su propio `MaterialApp`. Sus métodos:

- `wrap(home)`: una app cuyo inicio es `home`. No pone `Scaffold`; la pantalla trae el suyo si lo necesita.
- `wrapRouter(router)`: la misma app sobre un `GoRouter` de prueba, para probar rutas y guardias.
- `pump(tester, home)`: `tester.pumpWidget(wrap(home))`.

`delegates` agrega los del microfrontend bajo prueba, como `TasksLocalizations.delegate`. `session` es la sesión que ve `context.can`; sin valor, una sesión con `SessionBuilder()`.

```dart
await TestApp(
  delegates: const [TasksLocalizations.delegate],
  session: SessionBuilder().withPermissions({Permission.tasksRead}).build(),
).pump(tester, TasksListScreen(repository: repository));
```

`SessionBuilder` arma la sesión: `withPermissions`, `withRoles`, `withFeatures`, `withFlags`, `mfaVerifiedAt(at)` y `SessionBuilder.anonymous()`. `ProblemFixtures` da problemas del contrato listos: `unavailable()`, `forbidden()`, `notFound()` y `withCode(code, status:)`.

Cada microfrontend con varias pantallas tiene un arnés pequeño, con la forma de `TasksTestApp` en `test/utils/tasks_app.dart`. Monta las rutas reales del manifiesto sobre `TestApp.wrapRouter`, con una ruta de prueba para la página de acceso denegado:

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

## Los cuatro estados de una pantalla

Se prueba cada estado con un doble del repositorio, no con el estado forzado a mano. `FakeTasksRepository` recibe un `DemoBehavior` (latencia y fallos) y una `seed` (datos):

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

El estado de carga se verifica con el primer `pump` y `find.byType(LoadingView)`. Con retardo, `DemoBehavior(delay: ...)` deja la carga en curso hasta avanzar el tiempo. Para un estado que dura lo que la prueba decida, un repositorio con `Completer` (ver el último apartado).

## Layout compacto y expandido

`pumpAtWidths` pinta la misma pantalla a cada ancho (320, 800 y 1280 por defecto) y llama a `check` con el ancho. Restaura la superficie al terminar. `home` trae su propia app, así que el ancho llega al layout de la pantalla:

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

Si un ancho estrecho lanza un overflow, la prueba falla, y es lo correcto.

## Accesibilidad

`expectAccessible(tester)` de `test_utils` corre las cuatro guías de `flutter_test` (tamaño táctil en Android e iOS, etiqueta de los controles y contraste de texto) y libera el handle de semántica aunque una guía falle:

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

Para un control con nombre accesible concreto: `expect(tester.getSemantics(find.byIcon(Icons.close)), matchesSemantics(label: 'Cerrar', isButton: true, hasTapAction: true, isEnabled: true, hasEnabledState: true, isFocusable: true));`.

## Escala de texto

`pumpAtTextScale(tester, home)` fija la escala en 2.0 y la restaura al terminar. El `home` trae su app, igual que en `pumpAtWidths`:

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

Solo en `packages/ui` y solo para componentes visuales estables (botones, tarjetas, vistas de estado), con `flutter_test` y sin librerías extra. Van etiquetados para correrlos aparte, porque el render varía entre sistemas operativos y se generan y comparan en un solo entorno (el de CI).

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

Reglas: el golden mide aspecto, no comportamiento; un widget con datos dinámicos recibe datos fijos; los PNG viven junto a la prueba en `test/<carpeta>/goldens/`; se actualizan con `flutter test --update-goldens --tags golden` y el diff se revisa a ojo en el PR. La etiqueta se declara en el `dart_test.yaml` del paquete (`tags: {golden: {}}`).

## Bibliotecas diferidas en pruebas

Una prueba que abre una pantalla diferida necesita que su biblioteca esté cargada. `DeferredLibrariesPreloader` la carga en `setUpAll`, fuera de `testWidgets`, porque la VM guarda una sola carga por unidad diferida atada a la zona de la primera prueba que la pidió. Recibe los manifiestos y carga sus pantallas y los ciclos de vida que arrancan con ellas:

```dart
setUpAll(() => const DeferredLibrariesPreloader().load([tasksManifest]));
```

## Controlador sin widgets, con compuerta

Para probar que una respuesta vieja no pisa una nueva, el doble expone un `Completer` por llamada. `ScriptedTasksRepository` de `tasks` es la forma completa:

```dart
final class ScriptedTasksRepository implements TasksRepository {
  final List<Completer<Task>> gets = [];

  @override
  Future<Task> get(String id) {
    final completer = Completer<Task>();
    gets.add(completer);
    return completer.future;
  }
  // ...resto del puerto
}
```

La prueba lanza dos cargas, completa la segunda y luego la primera con `await pumpEventQueue()` entre una y otra, y verifica que el estado final es el de la segunda:

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
