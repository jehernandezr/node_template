# Estados, errores y async seguro

## Contenido

- Estado de pantalla como tipo cerrado
- Controlador con petición vigente
- Errores tipados
- Widget: `mounted` y acciones
- Cancelación y limpieza

## Estado de pantalla como tipo cerrado

Para cargar un valor se usa `AsyncValue<T>` de `package:ui/ui.dart` y `AsyncValueView` para pintarlo. Cuando la pantalla tiene más estados (borrador, enviando, enviado), se declara un `sealed` propio en `shared/types` o junto al controlador:

```dart
sealed class TaskFormState {
  const TaskFormState();
}

final class TaskFormEditing extends TaskFormState {
  const TaskFormEditing({this.fieldErrors = const {}});
  final Map<String, List<String>> fieldErrors;
}

final class TaskFormSaving extends TaskFormState {
  const TaskFormSaving();
}

final class TaskFormSaved extends TaskFormState {
  const TaskFormSaved(this.task);
  final Task task;
}
```

El widget lo pinta con un `switch` exhaustivo, sin `default`:

```dart
Widget build(BuildContext context) => switch (controller.state) {
  TaskFormEditing(:final fieldErrors) => _Form(errors: fieldErrors),
  TaskFormSaving() => const LoadingView(),
  TaskFormSaved(:final task) => TaskSavedView(task: task),
};
```

## Controlador con petición vigente

Patrón de `TasksListController`: cada carga que reemplaza el estado sube `_requestId`, y la respuesta que llega con un id viejo o después de `dispose` se descarta.

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

void _notify() {
  if (!_disposed) notifyListeners();
}
```

Los comandos de usuario (guardar, borrar) ignoran un segundo toque mientras corre el primero: un campo `_saving` que el método revisa al entrar, y el botón se deshabilita con ese mismo estado.

## Errores tipados

- El servidor responde `ApiErrorException` con un código del contrato (enum generado). La interfaz decide por el código, no por el texto: `errorMessage(l10n, code)` y `actionErrorMessage` de `ui`.
- Una validación del cliente que falla es un valor, no una excepción: `fieldErrorsByField` de `utils` agrupa los `FieldError` del contrato por campo, o un `sealed` con el campo y la causa.
- Un fallo propio del microfrontend se declara como `final class XException implements Exception` con campos tipados, como `SignedOutException`. Nunca `throw Exception('texto')` en código que alguien tiene que distinguir.
- `UnsupportedError` y `StateError` son para errores de programación (un modo que no sirve la operación), no para fallas de red.
- Un `catch` que no puede resolver el fallo lo relanza o lo pasa al controlador como `AsyncValue.error`. Nunca queda vacío.

## Widget: `mounted` y acciones

Un widget solo llama al controlador y muestra el resultado. Después de un `await` revisa que siga montado:

```dart
Future<void> _save() async {
  try {
    await widget.controller.save();
  } on Exception catch (error) {
    if (!mounted) return;
    showActionError(
      context,
      error,
      message: TasksLocalizations.of(context).saveError,
    );
    return;
  }
  if (!mounted) return;
  context.go(TasksPaths.list);
}
```

`showActionError` ya devuelve sin hacer nada si el contexto se desmontó, pero la navegación y cualquier otro uso del `context` necesitan su propia guarda. En una función que recibe un `BuildContext` se usa `context.mounted`.

## Cancelación y limpieza

- `Timer`, `StreamSubscription` y `StreamController` se crean en el controlador y se cancelan en su `dispose`. El widget que crea el controlador (en `initState`) lo libera en su `dispose`.
- Un `TextEditingController`, `FocusNode`, `ScrollController` o `AnimationController` tiene el mismo ciclo: `initState` crea, `dispose` libera.
- Trabajo que debe poder cancelarse (búsqueda mientras se escribe) usa el `_requestId` o un `Timer` con debounce inyectado, no `Future.delayed` suelto.
- Parseo de JSON grande o cálculo pesado: `Isolate.run` o `compute`, con una función de nivel superior que no capture el `this` de un widget.
