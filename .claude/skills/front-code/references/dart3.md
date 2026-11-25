# Dart 3 in the front

## Contents

- Sealed classes and exhaustive switch
- Records
- Pattern matching
- Primary constructors
- Enums with data

## Sealed classes and exhaustive switch

A `sealed` class describes a closed set of cases. Its subtypes are `final class` and a `switch` over it has no `default`:

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

Wrong: `_ => 'other'` over a `sealed`. If a third case shows up tomorrow, nobody notices.

## Records

They serve for a local return of two or three fields. If it repeats in three places or crosses a package boundary, it becomes a class.

```dart
(List<Task> items, String? nextCursor) _split(TasksPage page) =>
    (page.items, page.nextCursor);

final (items, nextCursor) = _split(page);
```

## Pattern matching

Decoding input data (server JSON already goes through `contracts`, so this applies to deep links, route `params` and platform data):

```dart
Task? parseTask(Object? json) => switch (json) {
  {'id': final String id, 'title': final String title} => Task(id: id, title: title),
  _ => null,
};
```

Rules:

- If malformed data must fail, it is not filtered silently with `if (x case ...)`. Throw a `FormatException` with what was received.
- A single value that needs promotion uses `if (x is T)`, not `if (x case final T t)`.
- A `switch` with a single case or over a boolean is an `if`.
- Route segments: `switch (segments) { ['tasks', final id] => ..., ['tasks'] => ... }` instead of `.length` and indexes.
- Two cases with the same body are joined with `||`.

## Primary constructors

They are enabled with SDK 3.14. In new code they can be used to remove the field, parameter and initialization repetition:

```dart
final class TaskSummary(final String id, final String title);
```

They stop being worth it if the class needs to validate, assign a computed default or document each field separately. Existing code that uses `this._field` parameters stays as it is; it is rewritten only when touched.

## Enums with data

An enum with fields and methods replaces a repeated `switch` with a map of constants:

```dart
enum ReportPeriod {
  daily('day'),
  monthly('month');

  const ReportPeriod(this.wire);
  final String wire;
}
```

An enum's interface texts do not live in the enum: a `taskStatusLabel(l10n, status)` function with an exhaustive `switch`, as `tasks` already does.
