# Dart 3 en el front

## Contenido

- Sealed classes y switch exhaustivo
- Records
- Pattern matching
- Constructores primarios
- Enums con datos

## Sealed classes y switch exhaustivo

Un `sealed` describe un conjunto cerrado de casos. Sus subtipos son `final class` y el `switch` sobre él no lleva `default`:

```dart
sealed class SessionState {
  const SessionState();
}

final class Anonymous extends SessionState {
  const Anonymous();
}

final class Authenticated extends SessionState {
  const Authenticated(this.session);
  final UserSession session;
}

String label(SessionState state) => switch (state) {
  Anonymous() => 'anon',
  Authenticated(:final session) => session.userId,
};
```

Mal: `_ => 'otro'` sobre un `sealed`. Si mañana hay un tercer caso, nadie se entera.

## Records

Sirven para un retorno local de dos o tres campos. Si se repite en tres sitios o cruza una frontera de paquete, se convierte en clase.

```dart
(List<Task> items, String? nextCursor) _split(TasksPage page) =>
    (page.items, page.nextCursor);

final (items, nextCursor) = _split(page);
```

## Pattern matching

Decodificar datos de entrada (JSON del servidor ya pasa por `contracts`, así que esto aplica a deep links, `params` de rutas y datos de plataforma):

```dart
Task? parseTask(Object? json) => switch (json) {
  {'id': final String id, 'title': final String title} => Task(id: id, title: title),
  _ => null,
};
```

Reglas:

- Si un dato mal formado debe fallar, no se filtra en silencio con `if (x case ...)`. Se lanza `FormatException` con lo recibido.
- Un solo valor que hay que promover usa `if (x is T)`, no `if (x case final T t)`.
- Un `switch` con un solo caso o sobre un booleano es un `if`.
- Segmentos de ruta: `switch (segments) { ['tasks', final id] => ..., ['tasks'] => ... }` en lugar de `.length` e índices.
- Dos casos con el mismo cuerpo se unen con `||`.

## Constructores primarios

Con el SDK 3.14 están habilitados. En código nuevo se pueden usar para eliminar la repetición campo, parámetro e inicialización:

```dart
final class TaskSummary(final String id, final String title);
```

Dejan de valer la pena si la clase necesita validar, asignar por defecto algo calculado o documentar cada campo por separado. El código existente (`MicrofrontendScope(this._services, {this._eventBus})`) se queda como está.

## Enums con datos

Un enum con campos y métodos reemplaza un `switch` repetido por un mapa de constantes:

```dart
enum TaskStatus {
  open('open'),
  inProgress('in_progress'),
  done('done');

  const TaskStatus(this.wire);
  final String wire;
}
```

Los textos de interfaz de un enum no viven en el enum: una función `taskStatusLabel(l10n, status)` con `switch` exhaustivo, como ya hace `tasks`.
