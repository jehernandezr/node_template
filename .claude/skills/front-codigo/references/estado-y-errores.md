# Estados, errores y async seguro

## Contenido

- Estado de pantalla como tipo cerrado
- Carga con `AsyncLoader`
- Acciones con `ActionRunner` y `ActionResult`
- Pantalla con `ControllerBuilder`
- Petición vigente a mano
- Errores tipados
- Cancelación y limpieza

## Estado de pantalla como tipo cerrado

Para un valor que se carga se usa `AsyncValue<T>` de `package:ui/ui.dart`: `AsyncLoading`, `AsyncData` y `AsyncError`. `AsyncValue.guard` convierte una `Future` en ese estado y solo atrapa `Exception`. `when` obliga a tratar los tres casos:

```dart
final Widget body = value.when(
  loading: () => const LoadingView(),
  data: (tasks) => TaskList(tasks: tasks),
  error: (error) => ErrorView.fromException(
    error,
    fallbackMessage: l10n.loadError,
    onRetry: onRetry,
  ),
);
```

Cuando la pantalla tiene más estados (borrador, enviando, enviado), se declara un `sealed` propio junto al controlador, como `TaskFormState`:

```dart
sealed class TaskFormState {
  const TaskFormState();
}

final class TaskFormEditing extends TaskFormState {
  const TaskFormEditing({this.task, this.fieldErrors = const {}});
  final Task? task;
  final Map<String, String> fieldErrors;
}

final class TaskFormSaving extends TaskFormState {
  const TaskFormSaving();
}

final class TaskFormSaved extends TaskFormState {
  const TaskFormSaved(this.taskId);
  final String taskId;
}
```

El widget lo pinta con un `switch` exhaustivo, sin `default`:

```dart
Widget build(BuildContext context) => switch (controller.state) {
  TaskFormEditing(:final fieldErrors) => _Form(errors: fieldErrors),
  TaskFormSaving() => const LoadingView(),
  TaskFormSaved(:final taskId) => TaskSavedView(taskId: taskId),
};
```

## Carga con `AsyncLoader`

`AsyncLoader<T>` de `ui` es dueño de una carga. Recibe la función que trae el valor, empieza en `AsyncLoading` y solo busca cuando se le pide. `load` descarta la respuesta de una llamada anterior, y `load(keepCurrent: true)` conserva los datos en pantalla mientras llega la nueva. `setData` reemplaza el valor (una edición optimista) y descarta la carga en curso. Nada notifica después de `dispose`. Los nombres de dominio de los ejemplos de esta sección son ilustrativos, no existen en el código.

```dart
final class SessionsController extends ChangeNotifier {
  SessionsController(AccountRepository repository)
    : _loader = AsyncLoader(repository.listSessions) {
    _loader.addListener(notifyListeners);
  }

  final AsyncLoader<List<SessionSummary>> _loader;

  AsyncValue<List<SessionSummary>> get sessions => _loader.value;

  Future<void> start() => _loader.load();

  @override
  void dispose() {
    _loader.dispose();
    super.dispose();
  }
}
```

## Acciones con `ActionRunner` y `ActionResult`

`ActionRunner` de `ui` ejecuta lo que el usuario dispara y devuelve un `ActionResult<T>` cerrado:

- `ActionSucceeded<T>(value)`: la acción terminó.
- `ActionFailed<T>(error, stackTrace)`: lanzó una `Exception`. Un `Error` escapa.
- `ActionSkipped<T>()`: no corrió, porque ya había una acción en curso (`ActionConcurrency.dropWhileRunning`) o porque se rechazó una precondición (un step-up).

`ActionConcurrency` tiene tres modos: `parallel`, `serial` (cada llamada espera a la anterior) y `dropWhileRunning`, que es el valor por defecto. `isRunning` dice si hay una acción pendiente y el controlador lo expone para deshabilitar el botón.

```dart
Future<ActionResult<void>> closeSession(String id) async {
  final result = await _runner.run(() => _repository.revokeSession(id));
  if (result is ActionSucceeded<void>) {
    unawaited(_loader.load(keepCurrent: true));
  }
  return result;
}
```

## Pantalla con `ControllerBuilder`

`ControllerBuilder<C>` de `ui` crea el controlador una vez en `initState`, escucha sus cambios, reconstruye y lo libera en `dispose`. La pantalla queda como `StatelessWidget`:

```dart
class SessionsScreen extends StatelessWidget {
  const SessionsScreen({super.key, required this.repository});

  final AccountRepository repository;

  @override
  Widget build(BuildContext context) => ControllerBuilder<SessionsController>(
    create: (_) => SessionsController(repository)..start(),
    builder: (context, controller) => AsyncValueView<List<SessionSummary>>(
      value: controller.sessions,
      errorMessage: AccountLocalizations.of(context).loadError,
      onRetry: controller.start,
      data: (sessions) => SessionsList(sessions: sessions),
    ),
  );
}
```

Si el repositorio puede cambiar de identidad, la pantalla lo usa como `key: ObjectKey(repository)` para reconstruir el controlador con el nuevo.

Una acción se muestra con `showActionResult`, que ya revisa si el contexto sigue montado:

```dart
final result = await controller.closeSession(id);
if (!context.mounted) return;
showActionResult(
  context,
  result,
  success: AccountLocalizations.of(context).sessionClosed,
);
```

## Petición vigente a mano

`TasksListController` necesita más que una carga: filtra, busca y pagina con cursor. Ahí `AsyncLoader` no cabe y el controlador lleva su propio `_requestId`. Cada carga que reemplaza la lista sube el id, y la respuesta con un id viejo o llegada después de `dispose` se descarta:

```dart
Future<void> reload() async {
  final request = ++_requestId;
  _items = const AsyncValue.loading();
  _notify();
  final result = await AsyncValue.guard(_repository.list);
  if (_disposed || request != _requestId) return;
  _items = result;
  _notify();
}
```

Fuera de ese caso, se usa `AsyncLoader`.

## Errores tipados

- El servidor responde `ApiErrorException` con un código del contrato (enum generado). La interfaz decide por el código, no por el texto. `ErrorPresenter` de `i18n` describe el error: `describe(error)` devuelve un `ErrorDetails` con `message`, `code` y `traceId`; `actionMessage(error)` da el texto de una acción. `errorMessage(l10n, code)` de `i18n` da el texto de un código.
- Una validación del cliente que falla es un valor, no una excepción: `fieldErrorsByField` de `utils` agrupa los `FieldError` del contrato por campo.
- Un fallo propio del microfrontend se declara como `final class XException implements Exception` con campos tipados, como `SignedOutException`. Nunca `throw Exception('texto')` en código que alguien tiene que distinguir.
- `UnsupportedError` y `StateError` son para errores de programación (un modo que no sirve la operación), no para fallas de red.
- `AsyncValue.guard` y `ActionRunner` atrapan solo `Exception`. Un `Error` escapa porque es un bug.
- Un `catch` sin `on` solo se escribe con la marca `// catch-all: <motivo>` en la línea anterior, y en un punto que reporta el fallo (por ejemplo `FlutterError.reportError`). Nunca queda vacío.

## Widget: `mounted` y acciones

Un widget solo llama al controlador y muestra el resultado. Después de un `await` revisa que siga montado:

```dart
Future<void> _save() async {
  final result = await widget.controller.save();
  if (!mounted) return;
  if (result is ActionSucceeded<String>) {
    context.go(TasksPaths.detail(result.value));
    return;
  }
  showActionResult(
    context,
    result,
    failure: TasksLocalizations.of(context).saveError,
  );
}
```

`showActionResult` devuelve sin hacer nada si el contexto ya no está montado, pero la navegación y cualquier otro uso del `context` necesitan su propia guarda.

## Cancelación y limpieza

- `Timer`, `StreamSubscription` y `StreamController` se crean en el controlador y se cancelan en su `dispose`. El widget que crea el controlador lo libera con `ControllerBuilder`.
- Un `TextEditingController`, `FocusNode`, `ScrollController` o `AnimationController` tiene el mismo ciclo: `initState` crea, `dispose` libera.
- Trabajo que debe poder cancelarse (búsqueda mientras se escribe) usa un `Timer` con debounce, como `TasksListController.search`, con el retardo inyectado, no `Future.delayed` suelto.
- Parseo de JSON grande o cálculo pesado: `Isolate.run` o `compute`, con una función de nivel superior que no capture el `this` de un widget.
