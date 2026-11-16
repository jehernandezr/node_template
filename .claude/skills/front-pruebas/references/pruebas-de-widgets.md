# Pruebas de widgets

## Contenido

- `pumpApp` y superficie
- Los cuatro estados de una pantalla
- Layout compacto y expandido
- Accesibilidad
- Escala de texto
- Golden tests
- Prueba de controlador con compuerta

## `pumpApp` y superficie

Cada paquete con pruebas de widgets tiene un `test/utils/pump.dart` como el de `ui` (tema, locale y delegados). Ninguna prueba arma su propio `MaterialApp`.

```dart
Future<void> pumpApp(
  WidgetTester tester,
  Widget child, {
  Locale locale = const Locale('es'),
}) => tester.pumpWidget(
  MaterialApp(
    theme: AppTheme.light(),
    locale: locale,
    supportedLocales: supportedLocales,
    localizationsDelegates: [
      AppLocalizations.delegate,
      ...GlobalMaterialLocalizations.delegates,
    ],
    home: Scaffold(body: child),
  ),
);
```

`setSurface(tester, 400)` fija el ancho y lo restaura al terminar. Es la forma de probar breakpoints: `MediaQuery.sizeOf` y `LayoutBuilder` leen la superficie de la prueba.

## Los cuatro estados de una pantalla

Se prueba cada estado con un doble del repositorio, no con el estado forzado a mano:

```dart
testWidgets('shows the empty state when there are no tasks', (tester) async {
  final repository = FakeTasksRepository(delay: Duration.zero, seed: const []);
  addTearDown(repository.dispose);

  await pumpApp(tester, TasksListScreen(repository: repository));
  await tester.pump();

  expect(find.text('No hay tareas'), findsOneWidget);
});

testWidgets('shows the error state and retries', (tester) async {
  final repository = FailingTasksRepository();
  await pumpApp(tester, TasksListScreen(repository: repository));
  await tester.pump();

  expect(find.byType(ErrorView), findsOneWidget);
  await tester.tap(find.text('Reintentar'));
  await tester.pump();
  expect(repository.listCalls, 2);
});
```

El estado de carga se verifica con el primer `pump` y `find.byType(LoadingView)`; no se espera a que termine con `pumpAndSettle` si el indicador anima sin fin.

## Layout compacto y expandido

```dart
testWidgets('wide windows show the detail beside the list', (tester) async {
  setSurface(tester, 1200);
  await pumpApp(tester, TasksListScreen(repository: repository));
  await tester.pumpAndSettle();

  expect(find.byType(VerticalDivider), findsOneWidget);
});

testWidgets('compact windows show only the list', (tester) async {
  setSurface(tester, 400);
  await pumpApp(tester, TasksListScreen(repository: repository));
  await tester.pumpAndSettle();

  expect(find.byType(VerticalDivider), findsNothing);
});
```

Si la superficie estrecha lanza un overflow, la prueba falla, y es lo correcto.

## Accesibilidad

`flutter_test` trae guías que se aplican a los widgets compartidos de `ui` y a las pantallas con acciones propias:

```dart
testWidgets('actions meet tap target and label guidelines', (tester) async {
  final handle = tester.ensureSemantics();
  await pumpApp(tester, const TaskActions());

  await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
  await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
  await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
  await expectLater(tester, meetsGuideline(textContrastGuideline));
  handle.dispose();
});
```

Para un control con nombre accesible: `expect(tester.getSemantics(find.byIcon(Icons.close)), matchesSemantics(label: 'Cerrar', isButton: true, hasTapAction: true, isEnabled: true, hasEnabledState: true, isFocusable: true));`.

## Escala de texto

```dart
testWidgets('survives 2x text scale', (tester) async {
  tester.platformDispatcher.textScaleFactorTestValue = 2;
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  await pumpApp(tester, const TaskDetailView(task: _task));
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
  setSurface(tester, 400, height: 300);
  await pumpApp(tester, const EmptyState(icon: Icons.inbox, title: 'Sin datos'));

  await expectLater(
    find.byType(EmptyState),
    matchesGoldenFile('goldens/empty_state.png'),
  );
});
```

Reglas: el golden mide aspecto, no comportamiento; un widget con datos dinámicos recibe datos fijos; los PNG viven junto a la prueba en `test/<carpeta>/goldens/`; se actualizan con `flutter test --update-goldens --tags golden` y el diff se revisa a ojo en el PR. La etiqueta se declara en el `dart_test.yaml` del paquete (`tags: {golden: {}}`).

## Prueba de controlador con compuerta

Para probar que una respuesta vieja no pisa una nueva, el doble expone un `Completer` por llamada:

```dart
final class _GatedRepository implements TasksRepository {
  final calls = <Completer<TasksPage>>[];

  @override
  Future<TasksPage> list({TaskStatus? status, String? cursor}) {
    final call = Completer<TasksPage>();
    calls.add(call);
    return call.future;
  }
  // ...resto del puerto delegado
}
```

La prueba lanza dos cargas, completa la segunda y luego la primera, y verifica que el estado final es el de la segunda.
