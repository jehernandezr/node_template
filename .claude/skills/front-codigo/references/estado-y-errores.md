# States, errors and safe async

## Contents

- Screen state as a closed type
- Loading with `AsyncLoader`
- Actions with `ActionRunner` and `ActionResult`
- Screen with `ControllerBuilder`
- Current request by hand
- Typed errors
- Cancellation and cleanup

## Screen state as a closed type

For a value that is loaded, use `AsyncValue<T>` from `package:ui/ui.dart`: `AsyncLoading`, `AsyncData` and `AsyncError`. `AsyncValue.guard` turns a `Future` into that state and catches only `Exception`. `when` forces handling the three cases:

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

When the screen has more states (draft, sending, sent), declare a custom `sealed` next to the controller, like `TaskFormState`:

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

The widget paints it with an exhaustive `switch`, without `default`:

```dart
Widget build(BuildContext context) => switch (controller.state) {
  TaskFormEditing(:final fieldErrors) => _Form(errors: fieldErrors),
  TaskFormSaving() => const LoadingView(),
  TaskFormSaved(:final taskId) => TaskSavedView(taskId: taskId),
};
```

## Loading with `AsyncLoader`

`AsyncLoader<T>` from `ui` owns a load. It receives the function that fetches the value, starts in `AsyncLoading` and only fetches when asked. `load` discards the response of a previous call, and `load(keepCurrent: true)` keeps the data on screen while the new one arrives. `setData` replaces the value (an optimistic edit) and discards the load in progress. Nothing notifies after `dispose`. The domain names in this section's examples are illustrative; they do not exist in the code.

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

## Actions with `ActionRunner` and `ActionResult`

`ActionRunner` from `ui` runs what the user triggers and returns a closed `ActionResult<T>`:

- `ActionSucceeded<T>(value)`: the action finished.
- `ActionFailed<T>(error, stackTrace)`: it threw an `Exception`. An `Error` escapes.
- `ActionSkipped<T>()`: it did not run, because an action was already in progress (`ActionConcurrency.dropWhileRunning`) or because a precondition was rejected (a step-up).

`ActionConcurrency` has three modes: `parallel`, `serial` (each call waits for the previous one) and `dropWhileRunning`, which is the default. `isRunning` says whether an action is pending, and the controller exposes it to disable the button.

```dart
Future<ActionResult<void>> closeSession(String id) async {
  final result = await _runner.run(() => _repository.revokeSession(id));
  if (result is ActionSucceeded<void>) {
    unawaited(_loader.load(keepCurrent: true));
  }
  return result;
}
```

## Screen with `ControllerBuilder`

`ControllerBuilder<C>` from `ui` creates the controller once in `initState`, listens to its changes, rebuilds and disposes it in `dispose`. The screen stays a `StatelessWidget`:

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

If the repository can change identity, the screen uses it as `key: ObjectKey(repository)` to rebuild the controller with the new one.

An action is shown with `showActionResult`, which already checks whether the context is still mounted:

```dart
final result = await controller.closeSession(id);
if (!context.mounted) return;
showActionResult(
  context,
  result,
  success: AccountLocalizations.of(context).sessionClosed,
);
```

## Current request by hand

`TasksListController` needs more than a load: it filters, searches and paginates with a cursor. `AsyncLoader` does not fit there, and the controller keeps its own `_requestId`. Every load that replaces the list bumps the id, and a response with an old id or arriving after `dispose` is discarded:

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

Outside that case, use `AsyncLoader`.

## Typed errors

- The server responds with `ApiErrorException` carrying a contract code (generated enum). The interface decides by the code, not by the text. `ErrorPresenter` from `i18n` describes the error: `describe(error)` returns an `ErrorDetails` with `message`, `code` and `traceId`; `actionMessage(error)` gives an action's text. `errorMessage(l10n, code)` from `i18n` gives the text for a code.
- A failed client-side validation is a value, not an exception: `fieldErrorsByField` from `utils` groups the contract's `FieldError` values by field.
- A microfrontend's own failure is declared as `final class XException implements Exception` with typed fields, like `SignedOutException`. Never `throw Exception('text')` in code someone has to tell apart.
- `UnsupportedError` and `StateError` are for programming errors (a mode that does not serve the operation), not for network failures.
- `AsyncValue.guard` and `ActionRunner` catch only `Exception`. An `Error` escapes because it is a bug.
- A `catch` without `on` is only written with the `// catch-all: <reason>` mark on the line before, and at a point that reports the failure (for example `FlutterError.reportError`). It is never left empty.

## Widget: `mounted` and actions

A widget only calls the controller and shows the result. After an `await` it checks that it is still mounted:

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

`showActionResult` returns without doing anything if the context is no longer mounted, but navigation and any other use of the `context` need their own guard.

## Cancellation and cleanup

- `Timer`, `StreamSubscription` and `StreamController` are created in the controller and cancelled in its `dispose`. The widget that creates the controller disposes it with `ControllerBuilder`.
- A `TextEditingController`, `FocusNode`, `ScrollController` or `AnimationController` has the same lifecycle: `initState` creates, `dispose` releases.
- Work that must be cancellable (search while typing) uses a debounced `Timer`, like `TasksListController.search`, with the delay injected, not a loose `Future.delayed`.
- Large JSON parsing or heavy computation: `Isolate.run` or `compute`, with a top-level function that does not capture a widget's `this`.
