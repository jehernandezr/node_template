---
name: front-code
description: 'Code rules for the front (Flutter, Dart 3): classes and injection, controllers, typed states, safe async, /// documentation and review rules. Entry point of the front-* skills.'
paths:
  - 'front/**'
---

# Front code

When creating files, packages or microfrontends, load `front-structure`; when creating a microfrontend, `front-new-microfrontend`; on screens and widgets, `front-accessibility` and `front-performance` load on their own.

The front is enterprise software, not scripting. All new code, and all code that is touched, follows these rules. The sibling skills cover the rest: `front-structure`, `front-testing`, `front-accessibility`, `front-adaptive-layout`, `front-i18n`, `front-navigation`, `front-performance`, `front-security`, `front-analysis` and `front-new-microfrontend`.

## Classes, composition and injection

- Every piece with behavior is a class with a single responsibility. Its collaborators arrive through the constructor as `final` fields, typed with the port (abstract class or `interface class`), never with the concrete implementation.
- Composition over inheritance. Concrete classes are `final class`; ports are `abstract interface class`.
- No global instances and no state in top-level variables. Dependencies are assembled in the shell (`ShellHost`) and reach each microfrontend through `ShellServices` and its scope.
- Top-level functions only for pure utilities without dependencies.
- Time is injected. `Clock` (`typedef Clock = DateTime Function()`) and `systemClock` live in `package:utils`, the only place with `DateTime.now()`. A controller receives the `Clock` or a `Duration` through its constructor. Never `DateTime.now()` or a `Timer` with fixed times inside the logic.
- A single pub workspace and minimal dependencies. The principles of Riverpod, BLoC or Freezed (immutable state, a single owner, events going up) are achieved with `ChangeNotifier`, `final` and `sealed` classes. Those libraries and code generators are not added.

## Layers

- **Widgets:** they only paint state and forward events. No HTTP calls, no business rules, no logic `try/catch`. The only things allowed: showing or hiding based on state, the widget's own animations, layout by width and simple navigation. A screen is a `StatelessWidget` with `ControllerBuilder`.
- **Controllers and flows** (`ChangeNotifier`): they hold the screen state and the logic, and are tested without widgets. Examples: `SignInFlow` and `StepUpFlow` from `auth`, `TasksListController`.
- **Repositories:** ports in the microfrontend or package; API adapters (on top of `ApiClient`) and demo adapters (in memory) chosen by `RepositoryBinding` according to the `ShellMode`.
- **Contracts:** only the generated types in `front/packages/contracts`. No front code imports the backend.
- Unidirectional flow: data goes down from the repository to the controller and the widget; events go up through controller methods.

## States, errors and async

Details, signatures and examples in [references/state-and-errors.md](references/state-and-errors.md). Summary:

- A screen's state is a closed type: `AsyncValue<T>` from `ui` (`AsyncLoading`, `AsyncData`, `AsyncError`) or a custom `sealed` hierarchy.
- The controller composes a load with `AsyncLoader<T>` from `ui`, which discards the response of a stale call and does not notify after `dispose`. A user action goes through `ActionRunner`, which returns an `ActionResult` (`ActionSucceeded`, `ActionFailed` or `ActionSkipped`).
- Only logic that does not fit in an `AsyncLoader` (search with filters and pagination, like `TasksListController.reload`) has its own `_requestId`.
- The controller exposes immutable state. It changes state by assigning a new value and calling `notifyListeners`, never by mutating a list it already handed out.
- In a widget, after every `await`, check `context.mounted` before using the `context`. Action results are shown with `showActionResult`.
- `AsyncValue.guard` and `ActionRunner` catch only `Exception`: an `Error` is a bug and escapes. A catch-all is written as `on Object catch`, only at a point that reports the failure, and the method's `///` says why.
- Expected failures are typed exceptions (`ApiErrorException` with its contract code, `SignedOutException`). A server error text is never shown: it is translated with `ErrorPresenter` from `i18n`.
- Timers, subscriptions and `StreamController` are cancelled in `dispose`. A per-identity resource implements `ScopedResource`.

## Microfrontends

- They meet the ADR 0018 contract: a manifest with `id`, `platforms`, `modes`, `access`, `menu`, `deepLinks` and `screens` with `ScreenRoute.deferred`.
- They depend only on `front/packages`, never on another microfrontend. They communicate through shell events and routes.
- Screens, data and texts go behind `deferred as`. The manifest only imports constants, enums and the lifecycle.
- Each microfrontend's repository is declared with `RepositoryBinding` in `data/` and the screen requests it with `scope.repository(...)`. Fakes receive `DemoBehavior` for latency and scheduled failures.

## Dart 3

Details in [references/dart3.md](references/dart3.md). Summary:

- `sealed` plus an exhaustive `switch` for states and results: the compiler warns when a case is missing. No `_` branch over a `sealed` or a custom enum, so adding a case breaks compilation where it still needs handling.
- Records to return two or three values without a class (`(String name, int count)`). If the value travels across layers or is named in the public API, it is a class.
- Pattern matching to decode input maps and lists and to destructure. Not to replace a simple `if (x is T)`.
- Primary constructors (Dart 3.12 or later, the workspace uses 3.14) are allowed in new code when they remove repetition. Existing code is not migrated just for style.

## Clean Code

- Names that say what something is and follow the role: `TasksListController`, `ApiTasksRepository`, `TasksListScreen`, `taskStatusLabel`. No technology prefixes and no names that clash with Flutter types (bare `Page`, `Route`, `State`, `Theme`).
- Booleans shaped as questions (`isLoading`, `hasMore`, `canRetry`). No positional boolean parameters that change behavior: two methods or an enum.
- A `build` longer than about 60 lines is split into widgets (`StatelessWidget` classes), not into `_buildX` methods that rebuild everything on every change.
- Generated enums for permissions, errors, plans and flags. Never loose string literals.
- Interface texts come from the ARB files (see `front-i18n`); the text the server sends is never shown.
- Code explains itself: no inline comments (`//`). If a block needs one, rename it or extract it into a named method or widget. The documentation is the `///` of each public method and member (see "Documentation with `///`").

## Documentation with `///`

- Every public method, property and class in the shared packages and in each microfrontend has `///`, complete and concise; `public_member_api_docs` fails the analysis without it. Private members need no `///`: their name is enough, and a private member that holds a non-obvious reason states it in its `///` instead of an inline comment.
- There are no inline comments (`//` or `/* */`). Code explains itself through names, types and extracted methods or widgets. Exceptions: analyzer directives with their reason (`// ignore: <rule> -- <reason>` and `// ignore_for_file: <rule> -- <reason>`) and generated code, recognized by its path. A `///` documents a declaration: inside a function body or any other block of code it is an inline comment. The `inline-comment` rule of the front structure check enforces it (ADR 0038).
- First line: one sentence that summarizes and ends with a period, separated from the rest by an empty `///` line.
- Properties with a noun phrase (`/// Tasks of the current filter.`); booleans with "Whether" (`/// Whether another page can be appended.`); methods with a third-person verb (`/// Loads the first page.`). API comments are in English, like the rest of the code; user texts go in the ARB.
- Complete means it covers each parameter, what it returns and what it throws, woven into the prose as Effective Dart asks. No `@param`, `@return` or `@throws` tags. Concise means one sentence per idea and nothing that repeats the name.
- Symbols go in square brackets (`[TasksRepository]`); keywords and literals in backticks (`null`, `true`). No parentheses in links.
- An override that does not change the contract does not repeat the documentation. With a getter and setter, only the getter is documented.
- Code blocks state the language (` ```dart `).
- Documentation explains the contract (effects, conditions, errors), never the implementation, the process or the history of the change.

```dart
/// Appends the next page.
///
/// A failure leaves the list as it was and is rethrown for the screen to
/// report. Does nothing when [hasMore] is false or a page is already loading.
Future<void> loadMore() async { ... }
```

## Review rules

`interrogate` and whoever reviews a front diff, their own or an agent's, use as rules this skill, `front-structure`, `front-testing` and whichever applies to the change (accessibility, layout, i18n, navigation, performance, security). A finding is proven with a run or with the diff line that breaks the rule, and is fixed before the commit.

## With pstack

Method in `pstack-in-node-template`. The pstack skills that apply here: `principle-model-the-domain`, `principle-type-system-discipline`, `principle-laziness-protocol`, `principle-minimize-reader-load`, `architect`, `interrogate`, `blast-radius`.
