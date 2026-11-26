# Front review solution plan

Date: 2026-11-14. Status: approved by the user, with the decisions in section 8. The order of the waves alongside the backend and F4, the status of each package and how the troops work are in the [plan](README.md).

It resolves the findings of [the front review](../audits/2026-11-14-front-review.md). Microfrontend contract: [ADR 0012](../adr/0012-front-flutter-shells-microfrontends.md) and [ADR 0018](../adr/0018-microfrontend-contract.md). Rules: the `front-*` skills and `CLAUDE.md`.

Paths are relative to `front/` unless stated otherwise. Effort: S (less than half a day), M (1 to 2 days), L (more than 2 days).

## 1. Verification of the findings

I reread the report and checked each finding against the code. The `check-structure.mjs --all` script confirms the 3 `DateTime.now()` violations. I counted 24 `State` classes in microfrontends (28 with packages), 51 calls to `widget.repository.`, 0 `Semantics(` in `lib/`, 4 `tooltip`, 0 tests with accessibility guidelines or goldens, 3 controllers (`TasksListController`, `AssistantChatController` and `MfaFlow`) and 11 `catch` without `on` outside `contracts`.

### 1.1 They hold

U1, U2, U3, U5, U7, T1, I1, I2, I3, I4, SC1, SC2, SC3, SH1, SH2, A1, TU1, TU2, TU3, AC1 to AC7, AS1 to AS6, B0 to B5, BI1, BI2, BI4, N1 to N3, TK1 to TK5, V1, V2, V3, AP1 to AP3, M1, M2. Summary of what was checked:

- AP1: mobile picks the destination with `location.startsWith(e.path)` (`mobile_shell_scaffold.dart:58`), and `/tasks2` would mark `/tasks`. The web compares by manifest id.
- AP2: 719 and 652 lines of nearly identical tests.
- N1 and N2: `_markOptimistically` and `_update` revert to an earlier copy, so they overwrite later changes.
- AS2: `load()` has no `_requestId` and does `result.valueOrNull ?? _messages`.
- V1: `_secondsLeft--` in a `Timer.periodic`, with no clock.
- I3: 21 direct interpolations of `${l10n.x}` in microfrontends, plus the `·` separators (18 with that pattern). The report says 35 or more and the order of magnitude is right. There is also one in `ui`: `error_view.dart` builds `'${l10n.errorCodeLabel}: $errorCode'`.
- M1 and M2: `_localized` exists in 7 files and there are 6 fakes with their own latency and failures.

### 1.2 They hold with a correction

- **Cross-referenced ids.** U5 and the summary say "see B1" for the billing colors, and the finding is BI1. B1 is the sequential loading of `saga_detail_screen.dart`.
- **U3, `try/catch` in screens.** There are 12 `try {` blocks in `screens/`, not 24. The conclusion does not change.
- **U4, base accessibility.** The unlabeled spinner and the `InkWell` in `app_card.dart` hold. Three points do not:
  - The `loading` key already exists in both shared ARBs (`app_es.arb:36`). It does not need to be added. `LoadingView` does not use it.
  - The icons in `error_view` and `empty_state` do not need `ExcludeSemantics`: an `Icon` without `semanticLabel` already stays out of the semantics tree.
  - The minimum of 48 in `AppButton` is a product decision: the skill accepts 24 as the floor on web with a pointer. It goes to section 8.
- **SH2, location.** `MfaFlow` lives in `packages/auth`, not in `shell_host`. Three `shell_host` forms consume it. It is split like this: `auth` produces the state and `shell_host` adapts the widgets.
- **SH3.** The email field already declares `keyboardType`. Missing are `textInputAction`, the code field's `keyboardType` and the error's live region.
- **SH4 and `catch (error, stack)` in `microfrontend_scope.dart:97` and `shell_runtime.dart:229,267`.** The report only names `shell_host.dart:164`. All four report with `FlutterError.reportError` and carry on: it is intentional. They are documented with a `// catch-all:` comment and the script's new rule respects it (decision 3.17).
- **M3, exact versions.** It holds: 11 `go_router: ^`, 9 `intl: ^` and 12 `material_ui: ^`. But pub has no single version catalog in the workspace, so "a single source" is not possible. The exact number is pinned in each `pubspec.yaml` and the script watches it.
- **TU1, cycle risk.** The report fears that `test_utils` creates a cycle with `ui`. A development one already exists: `auth` has `test_utils` in `dev_dependencies` and `test_utils` depends on `auth`, and it works. `ui` does not use `test_utils` (it has its own `test/utils/pump.dart`), so `test_utils` can depend on `ui` without a new cycle.
- **AP2, location of the suite.** A package cannot import another's `test/`. The shared suite goes in `packages/test_utils/lib/src/shell/scenarios/`, not in `shell_host/test/` as the report proposes.
- **B5, dialogs.** The report's proposal (`useRootNavigator: false`) does not solve the problem. A dialog is a `Navigator` route, a sibling of the page, and never inherits the page's `Localizations.override`. It is solved with `DeferredLocalizations` plus a helper that reapplies the delegates (decision 3.8).
- **U6.** It holds, and it gets simpler: `ui` only imports `contracts` in `error_view.dart` and `action_error.dart`. Error mapping moves to `i18n` (which already has `errorMessage(l10n, code)`) and `ui` stops depending on `contracts`.
- **U1, risk.** Changing `guard` to `on Exception` makes a `StateError` thrown by a fake escape instead of showing as an error. Some tests use it as a failure (`account/test/screens/overview_screen_test.dart:49`, `screen_builders_test.dart:136`). They are changed to a typed exception.

### 1.3 Discarded or left out

- **BI3** (`usageLevelFor` inside `shared/types`): it is a pure function with no dependencies and the rule allows it. Not touched.
- **SC4** (`defaultLifecycleRetryDelay` and `Timer` in `shell_runtime.dart`): the report itself marks it as correct. Only the parameter is documented, inside P1.2.
- **A3** (`is Map<String, dynamic>` in `identity_connection.dart`): it is the allowed use of pattern matching. Left as is, unless touched.
- **TL2 and TL3** (`FrontRoot`, `CliExit`, `DeferredChunkChecker`): the report marks them as low priority and the CLI scripts are acceptable as they are. Out of scope.
- **AP4** (`front/build/`): it exists and contains only `.last_build_id`; it is covered by `front/**/build/` in `.gitignore`. It is local junk, not a versioned violation. It is deleted inside P0.2 for cleanliness, nothing more.
- **Hardening `analysis_options.yaml`** (TL1's proposal: `unawaited_futures`, `public_member_api_docs`, etc.): the `front-analysis` skill asks for it as its own change with everything green. Out of this plan (section 6).

## 2. How it is executed

### 2.1 Troop rules

A troop's way of working is the one in the [plan](README.md#how-a-wave-ran). In the front, also:

- Barrel files (`lib/<package>.dart`) and `pubspec.yaml` files are edited only by the lead. The Haikus ask the lead in writing for the export line they need.
- Skeletons carry this plan's signatures with `throw UnimplementedError()` bodies. The lead reviews the full diff and runs the acceptance commands before handing over.
- Every instruction to a Haiku names file, class, signature and test, never a "refactor whatever is needed".
- User texts, `///` comments and new comments follow `front-i18n` and `front-analysis`: ARB in Spanish and English, `///` in English.

### 2.2 Additive first, removal at the end

New APIs are added without breaking the old ones. Consumers migrate in waves 2 and 3, and wave 4 deletes the old ones. That way the repository compiles and passes tests at the close of each wave. To avoid filling the analysis with `deprecated_member_use` warnings (which `analyze` counts as `info`), legacy code does not carry `@Deprecated`: it carries a `/// Legacy: removed in wave 4.` comment and the list in section 4.5.

Agreed exception: `AccessRule` moves to a required `now` in wave 1, and the 5 microfrontend `manifest_test.dart` files that call it get the one-line change in the same wave (P1.2). They cannot wait.

### 2.3 Acceptance commands

Each work package runs, with its Nx projects (`front-<pubspec name>`; microfrontends are `front-mf_<id>` and the apps `front-web_shell` and `front-mobile_shell`):

```bash
pnpm nx run-many -t format-check analyze test --projects=<projects>
node .claude/skills/front-structure/scripts/check-structure.mjs --changed .
```

Also:

- A package that touches a manifest, deferred screens or `shell_core` runs `check_deferred_chunks` at the end, after building the web:

  ```bash
  cd front/apps/web && flutter build web --release --source-maps \
    && dart run ../../tools/check_deferred_chunks.dart
  ```

- A package that changes a shared API also runs `analyze` and `test` on its consumers, to prove the additive change broke nothing: `pnpm nx run-many -t analyze test --projects=<consumers>`.
- A microfrontend also runs `dart run tools/check_microfrontend_boundaries.dart` (already inside its `analyze`).
- After editing an ARB: `flutter gen-l10n` in the package folder, and the output in `l10n/generated` is versioned.
- After editing a `pubspec.yaml`: `flutter pub get` in `front/`.

## 3. Design decisions

All signatures are Dart 3. They are written with classic constructors; primary constructors are optional (`front-code`).

### 3.1 `Clock`

Today `Clock` lives in `auth` and five other declarations repeat `DateTime Function()`. It moves to `utils` (a leaf of the graph: depends on `contracts` and `intl`) and `auth`, `shell_core`, `shell_host` and `test_utils` import it. `utils` is the only place where `DateTime.now()` is called, and the script allows it only in `utils/lib/src/clock.dart`.

```dart
// packages/utils/lib/src/clock.dart
/// Source of the current time. Inject it; never call `DateTime.now()`.
typedef Clock = DateTime Function();

/// The wall clock. The default of composition roots (`ShellHost`, `ShellRuntime`).
DateTime systemClock() => DateTime.now();
```

```dart
// packages/test_utils/lib/src/clock/fake_clock.dart
/// Clock that only moves when the test says so.
final class FakeClock {
  /// Starts at [start], or at 2026-01-01 UTC.
  FakeClock([DateTime? start]);

  /// Current fake time. Pass it as a [Clock]: `clock: fake.now`.
  DateTime now();

  /// Moves the time forward by [by].
  void advance(Duration by);

  /// Jumps to [at].
  void set(DateTime at);
}
```

`AccessRule` stops calling `DateTime.now()`. The default value goes away and callers pass `clock()`:

```dart
bool allows(UserSession session, {required DateTime now});
AccessDecision decide(UserSession session, {required DateTime now});
bool reachableBy(UserSession session, {required DateTime now});
```

`ShellAccessScope`, `ShellRuntime`, `ShellHost` and `StepUpPage` use `Clock clock = systemClock`. Nothing else changes.

### 3.2 `AsyncValue`, `AsyncLoader`, `ActionRunner`

`AsyncValue` moves out of the widget file to `packages/ui/lib/src/state/async_value.dart`, and `guard` catches only `Exception`.

```dart
sealed class AsyncValue<T> {
  const AsyncValue();
  const factory AsyncValue.loading() = AsyncLoading<T>;
  const factory AsyncValue.data(T value) = AsyncData<T>;
  const factory AsyncValue.error(Object error, [StackTrace? stackTrace]) =
      AsyncError<T>;

  /// Runs [load]; an [Exception] becomes [AsyncError], an [Error] escapes.
  static Future<AsyncValue<T>> guard<T>(Future<T> Function() load);

  bool get isLoading;
  T? get valueOrNull;

  /// Exhaustive fold, so a screen cannot forget a case.
  R when<R>({
    required R Function() loading,
    required R Function(T value) data,
    required R Function(Object error) error,
  });
}
```

`AsyncLoader<T>` is the generic loading controller. It drops stale responses and does not notify after `dispose`.

```dart
// packages/ui/lib/src/state/async_loader.dart
final class AsyncLoader<T> extends ChangeNotifier {
  AsyncLoader(Future<T> Function() fetch);

  /// Current state. Starts as [AsyncLoading].
  AsyncValue<T> get value;

  /// Fetches again. The answer of an older call is dropped. With
  /// [keepCurrent] and data on screen, the data stays until the new one
  /// arrives instead of going back to loading.
  Future<void> load({bool keepCurrent = false});

  /// Replaces the data (optimistic edits) and drops any fetch in flight.
  void setData(T data);

  @override
  void dispose();
}
```

`ActionRunner` runs user actions without a `BuildContext` and returns a closed result:

```dart
// packages/ui/lib/src/state/action_runner.dart
sealed class ActionResult<T> {
  const ActionResult();
}

/// The action finished and returned [value].
final class ActionSucceeded<T> extends ActionResult<T> {
  const ActionSucceeded(this.value);
  final T value;
}

/// The action threw an [Exception].
final class ActionFailed<T> extends ActionResult<T> {
  const ActionFailed(this.error, [this.stackTrace]);
  final Object error;
  final StackTrace? stackTrace;
}

/// The action did not run: the runner was busy or a precondition (a step-up)
/// was declined.
final class ActionSkipped<T> extends ActionResult<T> {
  const ActionSkipped();
}

/// What to do with a call made while another one is running.
enum ActionConcurrency { parallel, serial, dropWhileRunning }

final class ActionRunner extends ChangeNotifier {
  ActionRunner({this.concurrency = ActionConcurrency.dropWhileRunning});

  final ActionConcurrency concurrency;

  /// Whether at least one action is running.
  bool get isRunning;

  /// Runs [action]. An [Exception] becomes [ActionFailed]; an [Error] escapes.
  Future<ActionResult<T>> run<T>(Future<T> Function() action);

  @override
  void dispose();
}
```

Two more `ui` pieces close the pattern in the widget:

```dart
/// Owns a controller for the life of the widget: creates it once, listens to
/// it, rebuilds on change and disposes it. A screen built with it can be a
/// StatelessWidget.
class ControllerBuilder<C extends ChangeNotifier> extends StatefulWidget {
  const ControllerBuilder({
    super.key,
    required this.create,
    required this.builder,
  });

  /// Called once, in `initState`. May read inherited widgets with `read`
  /// style lookups only (for example `ShellAccessScope.maybeRead`).
  final C Function(BuildContext context) create;
  final Widget Function(BuildContext context, C controller) builder;
}

/// Shows the outcome of an action: the [success] text on [ActionSucceeded],
/// [showActionError] on [ActionFailed], nothing on [ActionSkipped]. Returns
/// whether it showed something. Does nothing if [context] is unmounted.
bool showActionResult(
  BuildContext context,
  ActionResult<Object?> result, {
  String? success,
  String? failure,
});
```

`showActionError` stays as it is. `ErrorView`, `AsyncValueView` and `showActionError` stop importing `contracts` (decision 3.5).

### 3.3 The per-screen controller

Rule: every screen with state or logic has a `final class XController extends ChangeNotifier` in `screens/x_controller.dart`. It receives the repository port through its constructor and, if needed, a `StepUpGate`, a `Clock` or a `Duration`. It composes an `AsyncLoader` and an `ActionRunner`, exposes immutable state and returns the result of each action. The screen is a `StatelessWidget` with `ControllerBuilder`. It is tested without widgets.

Example from `account`:

```dart
final class SessionsController extends ChangeNotifier {
  SessionsController(AccountRepository repository, {required StepUpGate stepUp})
    : _repository = repository,
      _stepUp = stepUp,
      _loader = AsyncLoader(repository.listSessions),
      _runner = ActionRunner() {
    _loader.addListener(notifyListeners);
    _runner.addListener(notifyListeners);
  }

  final AccountRepository _repository;
  final StepUpGate _stepUp;
  final AsyncLoader<List<SessionSummary>> _loader;
  final ActionRunner _runner;

  /// Active sessions, loading or failed.
  AsyncValue<List<SessionSummary>> get sessions => _loader.value;

  /// Whether a close action is running.
  bool get isBusy => _runner.isRunning;

  /// Loads the sessions.
  Future<void> start() => _loader.load();

  /// Closes one session and reloads the list.
  Future<ActionResult<void>> closeSession(String id) async {
    final result = await _runner.run(() => _repository.revokeSession(id));
    if (result is ActionSucceeded<void>) unawaited(_loader.load(keepCurrent: true));
    return result;
  }

  /// Closes every other session after a step-up. Returns how many closed, or
  /// [ActionSkipped] when the user declines the step-up.
  Future<ActionResult<int>> closeOthers() async {
    if (!await _stepUp.ensure()) return const ActionSkipped();
    final result = await _runner.run(_repository.revokeOtherSessions);
    if (result is ActionSucceeded<int>) unawaited(_loader.load(keepCurrent: true));
    return result;
  }

  @override
  void dispose() {
    _loader.dispose();
    _runner.dispose();
    super.dispose();
  }
}
```

The screen looks like this:

```dart
class SessionsScreen extends StatelessWidget {
  const SessionsScreen({super.key, required this.repository, required this.requestStepUp});

  final AccountRepository repository;
  final Future<bool> Function() requestStepUp;

  @override
  Widget build(BuildContext context) => ControllerBuilder<SessionsController>(
    create: (context) => SessionsController(
      repository,
      stepUp: StepUpGate.fromContext(
        context,
        rule: AccountAccess.stepUp,
        request: requestStepUp,
      ),
    )..start(),
    builder: (context, controller) => AppPage(
      title: AccountLocalizations.of(context).sessionsTitle,
      body: AsyncValueView<List<SessionSummary>>(
        value: controller.sessions,
        errorMessage: AccountLocalizations.of(context).loadError,
        onRetry: controller.start,
        data: (sessions) => SessionsList(sessions, onClose: (id) async {
          final result = await controller.closeSession(id);
          if (!context.mounted) return;
          showActionResult(context, result, success: AccountLocalizations.of(context).sessionClosed);
        }),
      ),
    ),
  );
}
```

Controller catalog (typed state in parentheses when `AsyncValue` is not enough):

| Package       | Controller                                                                                                                      | Main state and methods                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| account       | `SessionsController`                                                                                                            | above                                                                                                                                                                     |
| account       | `DevicesController`                                                                                                             | `AsyncValue<List<DeviceSummary>>`, `revoke(id)`, `rename(id, name)`                                                                                                       |
| account       | `SecurityController`                                                                                                            | `AsyncValue<SecuritySnapshot>`, `enableTotp()`, `regenerateCodes()` returns `ActionResult<List<String>>` (the `codes` are no longer captured in a closure)                |
| account       | `AgreementsController`                                                                                                          | `AsyncValue<List<AgreementItem>>`, `accept(id)`                                                                                                                           |
| account       | `AccountOverviewController`                                                                                                     | `AsyncValue<AccountOverview>`                                                                                                                                             |
| backoffice    | `SagasController`, `SagaDetailController`, `DlqController`, `TenantsController`, `TenantDetailController`, `OverviewController` | `AsyncLoader` per screen; `SagaDetailController` loads the saga and its log with `Future.wait`; `DlqController.retry(id)` and `discard(id, reason)` return `ActionResult` |
| billing       | `BillingPlanController`, `InvoicesController`, `InvoiceDetailController`, `ChangePlanController`                                | see sealed below                                                                                                                                                          |
| notifications | `InboxController`, `PreferencesController`                                                                                      | see sealed below                                                                                                                                                          |
| tasks         | `TaskFormController`, `TaskDetailController`                                                                                    | see sealed below; `TasksListController` already exists                                                                                                                    |
| verifier      | `VerifierController`                                                                                                            | see sealed below                                                                                                                                                          |
| assistant     | `AssistantChatController` (rebuilt)                                                                                             | see sealed below                                                                                                                                                          |

The field names of the contract types (`DeviceSummary`, `SecuritySnapshot`, etc.) are illustrative: each package's lead uses the real ones.

Sealed states of the screens that are not a simple load:

```dart
// billing: ChangePlanController
sealed class ChangePlanState { const ChangePlanState(); }
final class ChangePlanLoading extends ChangePlanState { const ChangePlanLoading(); }
final class ChangePlanChoosing extends ChangePlanState {
  const ChangePlanChoosing(this.plans, this.selectedId);
  final List<Plan> plans;
  final String? selectedId;
}
final class ChangePlanSaving extends ChangePlanState {
  const ChangePlanSaving(this.plans, this.selectedId);
  final List<Plan> plans;
  final String selectedId;
}
final class ChangePlanFailed extends ChangePlanState {
  const ChangePlanFailed(this.plans, this.selectedId, this.error);
  final List<Plan> plans;
  final String? selectedId;
  final Object error;
}
final class ChangePlanDone extends ChangePlanState { const ChangePlanDone(); }

// notifications: InboxController
/// [live] arrivals wait in the controller while a save runs; a failed save
/// reverts only the `read` flag of the affected ids, never the list.
final class InboxController extends ChangeNotifier {
  InboxController(NotificationsRepository repository);
  AsyncValue<List<AppNotification>> get inbox;
  int get unreadCount;
  Future<void> start();
  Future<ActionResult<void>> markRead(String id);
  Future<ActionResult<void>> markAllRead();
}

// notifications: PreferencesController. Saves one at a time, the latest wins.
final class PreferencesController extends ChangeNotifier {
  PreferencesController(NotificationsRepository repository);
  AsyncValue<NotificationPreferences> get preferences;
  Future<void> start();
  void setChannel(NotificationChannel channel, {required bool enabled});
  void setQuietStart(TimeOfDay time);
  void setQuietEnd(TimeOfDay time);
}

// tasks
sealed class TaskFormState { const TaskFormState(); }
final class TaskFormLoading extends TaskFormState { const TaskFormLoading(); }
final class TaskFormLoadFailed extends TaskFormState {
  const TaskFormLoadFailed(this.error);
  final Object error;
}
final class TaskFormEditing extends TaskFormState {
  const TaskFormEditing({this.task, this.fieldErrors = const {}});
  final Task? task;
  final Map<String, String> fieldErrors;
}
final class TaskFormSaving extends TaskFormState { const TaskFormSaving(); }
final class TaskFormSaved extends TaskFormState {
  const TaskFormSaved(this.taskId);
  final String taskId;
}

sealed class TaskDetailState { const TaskDetailState(); }
final class TaskDetailShowing extends TaskDetailState {
  const TaskDetailShowing(this.task);
  final AsyncValue<Task> task;
}
final class TaskDetailDeleting extends TaskDetailState { const TaskDetailDeleting(); }
final class TaskDetailDeleted extends TaskDetailState { const TaskDetailDeleted(); }

// verifier
sealed class VerifierState { const VerifierState(); }
final class VerifierWaiting extends VerifierState { const VerifierWaiting(); }
final class VerifierChallenge extends VerifierState {
  const VerifierChallenge({
    required this.challenge,
    required this.code,
    required this.secondsLeft,
    required this.copied,
  });
  final PendingChallenge challenge;
  final String code;
  final int secondsLeft;
  final bool copied;
}
final class VerifierDenying extends VerifierState { const VerifierDenying(); }
final class VerifierBlocked extends VerifierState { const VerifierBlocked(); }
final class VerifierFailed extends VerifierState {
  const VerifierFailed(this.error);
  final Object error;
}

final class VerifierController extends ChangeNotifier {
  /// [tick] is the period of the countdown; [clock] and `expiresAt` give the
  /// seconds left, so a backgrounded app does not drift.
  VerifierController(
    VerifierRepository repository, {
    required Clock clock,
    Duration tick = const Duration(seconds: 1),
  });
  VerifierState get state;
  Future<void> start();
  Future<ActionResult<void>> approve();
  Future<ActionResult<void>> deny();
  void markCopied();
}

// assistant
sealed class ChatState { const ChatState(); }
final class ChatLoading extends ChatState { const ChatLoading(); }
final class ChatReady extends ChatState {
  const ChatReady(this.messages, this.answer);
  final List<ChatMessage> messages;
  final AnswerState answer;
}
final class ChatFailed extends ChatState {
  const ChatFailed(this.error);
  final Object error;
}

sealed class AnswerState { const AnswerState(); }
final class AnswerIdle extends AnswerState { const AnswerIdle(); }
final class AnswerStreaming extends AnswerState {
  const AnswerStreaming(this.messageId);
  final String messageId;
}
final class AnswerFailed extends AnswerState {
  const AnswerFailed(this.kind);
  final ChatFailureKind kind;
}

enum ChatFailureKind { quotaExceeded, generic }
```

The field names of those contract types (`Plan`, `PendingChallenge`, `ChatMessage`) are the ones in the existing code; the lead confirms them when writing the skeleton.

### 3.4 `StatusColors` and tokens

`ColorPalette` has `successBase/On` and `warningBase/On` and has no `info`. `AppTheme` does not carry them into the theme. `info` is added to `design-tokens.json` and to `tokens`, along with a theme extension:

```dart
// packages/ui/lib/src/theme/status_colors.dart
@immutable
final class StatusColors extends ThemeExtension<StatusColors> {
  const StatusColors({
    required this.success,
    required this.onSuccess,
    required this.successContainer,
    required this.onSuccessContainer,
    required this.warning,
    required this.onWarning,
    required this.warningContainer,
    required this.onWarningContainer,
    required this.info,
    required this.onInfo,
    required this.infoContainer,
    required this.onInfoContainer,
  });

  /// Builds the roles from [palette]. Containers are the base color blended
  /// over the surface, so they stay readable in dark mode.
  factory StatusColors.fromPalette(ColorPalette palette);

  final Color success, onSuccess, successContainer, onSuccessContainer;
  final Color warning, onWarning, warningContainer, onWarningContainer;
  final Color info, onInfo, infoContainer, onInfoContainer;

  @override
  StatusColors copyWith({Color? success /* ... */});

  @override
  StatusColors lerp(StatusColors? other, double t);
}

extension StatusColorsContext on BuildContext {
  /// The status roles of the current theme.
  StatusColors get statusColors => Theme.of(this).extension<StatusColors>()!;
}
```

`AppTheme._build` registers `StatusColors.fromPalette(palette)` and adds `FilledButtonThemeData`, `OutlinedButtonThemeData` and `InputDecorationTheme` with a `minimumSize` of 48 (decision 8.2). `tokens` adds `AppRadius.full`, `AppIconSize` (`sm`, `md`, `xl`) and `AppLayout` (`listPaneWidth` 360, `readingWidth` 720, `wideContentWidth` 1100). `ui` adds `ContentColumn` (a `Center` with a `ConstrainedBox`) and the `context.localeTag` extension, which replaces the two `localeTag` functions in account and billing. The hexadecimal values of `info` and the containers are validated with `textContrastGuideline` in light and dark; the P1.1 lead pins them.

### 3.5 Domain-free errors in `ui`

`i18n` adds the dependency on `contracts` (which only depends on `meta`, no cycle) and absorbs the mapping:

```dart
// packages/i18n/lib/src/error_presenter.dart
@immutable
final class ErrorDetails {
  const ErrorDetails({required this.message, this.code, this.traceId});
  final String message;
  final String? code;
  final String? traceId;
}

final class ErrorPresenter {
  const ErrorPresenter(this.l10n);
  final AppLocalizations l10n;

  /// Message, code and trace id to show for [error]. An `ApiErrorException`
  /// gives the catalog message of its code; anything else gives
  /// [fallbackMessage] or the generic text.
  ErrorDetails describe(Object error, {String? fallbackMessage});

  /// Message of a failed user action (what `actionErrorMessage` returns today).
  String actionMessage(Object error);
}
```

`ErrorView` receives an `ErrorDetails`. `ErrorView.fromException` and `actionErrorMessage` are kept with the same signature and delegate to `ErrorPresenter`, so the microfrontends do not change in this step. `AccountAsyncView` and `AsyncBody` go away when their owners migrate.

### 3.6 `DeferredLibraryLoader`

It replaces the global `_libraryLoads` map and `resetDeferredPageCache()`. The cache lives in the instance; `ShellHost` creates one and hands it to the router.

```dart
// packages/shell_core/lib/src/deferred_library_loader.dart
final class DeferredLibraryLoader {
  /// [loading] and [errorBuilder] are the shell's defaults for pages that do
  /// not bring their own.
  DeferredLibraryLoader({
    this.loading,
    this.errorBuilder,
  });

  final Widget? loading;
  final Widget Function(Object error, VoidCallback retry)? errorBuilder;

  /// Loads a library once per instance. A failed load is forgotten so it can
  /// be retried.
  Future<void> load(Future<void> Function() loadLibrary);

  /// A page that shows [loading] until the library loads, then [builder].
  /// Matches [ScreenLoader], so `loader.page` can be passed where one is
  /// expected.
  Widget page({
    required Future<void> Function() loadLibrary,
    required Widget Function() builder,
    Widget? loading,
    Widget Function(Object error, VoidCallback retry)? errorBuilder,
  });
}
```

Tests create their own instance: there is no reset and the `loadNow` calls in `tasks` and `assistant` go away. `deferredPage`, `resetDeferredPageCache` and `shellScreenLoader` stay as legacy until wave 4.

### 3.7 `ScreenRoute.deferred`

```dart
/// Builds a deferred screen. [params] unites the path and query parameters.
typedef DeferredScreenBuilder = Widget Function(
  MicrofrontendScope scope,
  Map<String, String> params,
);

class ScreenRoute {
  // existing const constructor stays: this one calls it.

  /// One-liner for a screen whose library loads on demand. The loading view
  /// is the shell's default unless [loading] is given.
  factory ScreenRoute.deferred(
    String path, {
    required Future<void> Function() library,
    required DeferredScreenBuilder build,
    String? name,
    AccessRule? access,
    Widget? loading,
    List<ScreenRoute> routes = const [],
  });
}

extension ScreenParamsX on Map<String, String> {
  /// The parameter [name]; throws [StateError] when the route did not define it.
  String require(String name);
}
```

Each route goes from 6 lines to 3.

### 3.8 `DeferredLocalizations`

It replaces the seven `_localized` and `BackofficeLocalized`. It also registers the delegates for dialogs:

```dart
class DeferredLocalizations extends StatelessWidget {
  const DeferredLocalizations({
    super.key,
    required this.delegates,
    required this.child,
  });

  final List<LocalizationsDelegate<Object?>> delegates;
  final Widget child;
}

/// Dialogs and sheets are routes of the navigator, siblings of the page, so
/// they do not inherit the page's localizations. These reapply the delegates
/// of the nearest [DeferredLocalizations].
extension LocalizedOverlays on BuildContext {
  Future<T?> showLocalizedDialog<T>({
    required WidgetBuilder builder,
    bool barrierDismissible = true,
  });

  Future<T?> showLocalizedSheet<T>({
    required WidgetBuilder builder,
    bool isScrollControlled = false,
  });
}
```

`showBackofficeDialog` is replaced by `showLocalizedDialog`. If there is no `DeferredLocalizations` above, the helper throws a clear `FlutterError`.

### 3.9 `RepositoryBinding`

It replaces the four `_repository(scope)` functions and their repeated `switch`:

```dart
// packages/shell_core/lib/src/repository_binding.dart
final class RepositoryBinding<T extends Object> {
  const RepositoryBinding({required this.demo, required this.live});

  /// For a microfrontend whose `modes` is `{ShellMode.demo}`.
  const RepositoryBinding.demoOnly({required this.demo}) : live = null;

  final T Function(ShellServices services) demo;
  final T Function(ShellServices services)? live;

  /// The repository of [scope]: created on first use by mode, and disposed
  /// by the scope (it implements `ScopedResource`).
  T resolve(MicrofrontendScope scope);
}

extension RepositoriesOfScope on MicrofrontendScope {
  T repository<T extends Object>(RepositoryBinding<T> binding);
}
```

Each microfrontend declares its own in `data/<id>_data.dart`:

```dart
abstract final class TasksData {
  static final repository = RepositoryBinding<TasksRepository>.demoOnly(
    demo: (services) => FakeTasksRepository(behavior: DemoBehavior()),
  );
}
```

That file goes inside `data/`, which is a deferred folder: the manifest does not import it.

### 3.10 `DemoBehavior`

A composition piece for the six fakes: latency, programmable failures and shutdown. Each fake receives it through its constructor.

```dart
// packages/shell_core/lib/src/demo_behavior.dart
final class DemoBehavior {
  DemoBehavior({this.delay = Duration.zero, Clock clock = systemClock});

  /// Artificial wait of every response.
  final Duration delay;

  /// The fake's current time (never `DateTime.now()` inside a fake).
  DateTime now();

  /// Whether [dispose] ran.
  bool get isDisposed;

  /// Waits [delay], then throws the next failure that applies, or returns
  /// [compute]. [operation] tags the call (an enum value of the fake) so a
  /// failure can target one operation. After [dispose] it throws
  /// [DemoDisposedException].
  Future<T> respond<T>(T Function() compute, {Object? operation});

  /// Makes the next [count] calls (of [operation], or of any when null) throw
  /// [error].
  void failNext(Object error, {int count = 1, Object? operation});

  void dispose();
}

final class DemoDisposedException implements Exception {
  const DemoDisposedException();
}
```

`notifications` keeps its `StreamController` of live arrivals; only the latency and the failures (`fetchError`, `markError`, `saveError`) move to `failNext(error, operation: NotificationsOperation.markRead)`. The UUIDv7 generator in `tasks` moves out to its own class (TK2):

```dart
final class UuidV7Generator {
  UuidV7Generator({Clock clock = systemClock, Random? random});
  String next();
}
```

### 3.11 `StepUpGate` (account)

```dart
// microfrontends/account/lib/src/screens/step_up_gate.dart
final class StepUpGate {
  StepUpGate({
    required AccessRule rule,
    required ValueListenable<UserSession> session,
    required Clock clock,
    required Future<bool> Function() request,
  });

  /// Reads the session and clock of the nearest `ShellAccessScope`.
  factory StepUpGate.fromContext(
    BuildContext context, {
    required AccessRule rule,
    required Future<bool> Function() request,
  });

  /// True when the session already passes [rule]; otherwise asks the shell
  /// for a step-up and returns whether the user verified.
  Future<bool> ensure();
}
```

Only `account` asks for step-up today, so the class lives in `account` and not in `shell_core`. If another microfrontend needs it, it moves up to `shell_core` without changing the signature.

### 3.12 `ShellNavigator` and `ShellRouterFactory` (shell_core)

They replace `homeLocation`, `signOutAndGoToLogin`, `buildShellRouter` and `redirectFor`. `accessRedirect(rule)` and `AccessGate` stay public: they are part of the ADR 0018 contract.

```dart
final class ShellNavigator {
  ShellNavigator({
    required MicrofrontendRegistry registry,
    required ValueNotifier<UserSession> session,
    required AppPlatform platform,
    required ShellPaths paths,
  });

  /// Called once, after the router exists.
  void attach(GoRouter router);

  /// Path of the first menu entry the session sees, or null.
  String? home();

  /// [home], else forbidden for a signed-in user and login for anonymous.
  String landing();

  /// Resets the session to anonymous and goes to the plain login page.
  Future<void> signOutAndGoToLogin();
}

final class ShellRouterFactory {
  ShellRouterFactory({
    required MicrofrontendRegistry registry,
    required AppPlatform platform,
    required ShellRuntime runtime,
    required DeferredLibraryLoader loader,
    ShellPaths paths = const ShellPaths(),
    Clock? clock,
  });

  /// Validates paths, wraps every page with the identity epoch and the access
  /// scope, and returns the router. Throws [StateError] on a route outside
  /// its microfrontend's segment.
  GoRouter build({
    required List<RouteBase> routes,
    required ShellRouteBuilder shellBuilder,
  });
}
```

### 3.13 Splitting `ShellHost` (shell_host)

`ShellHost` keeps its current constructor as a `factory`, so the two apps do not change until wave 4. The generative constructor receives the pieces.

```dart
final class MenuBadges {
  MenuBadges({required MicrofrontendRegistry registry, required ShellEventBus bus});

  /// Count of each entry with a badge, by entry path.
  ValueListenable<Map<String, int>> get counts;
  int? countFor(MenuEntry entry);

  /// Back to empty, for a new identity.
  void reset();
  Future<void> dispose();
}

/// Follows the access of a real connection: the session mirrors it, and
/// when identity closes the session the user goes back to sign-in.
final class SessionBinding {
  SessionBinding({
    required IdentityConnection connection,
    required ValueNotifier<UserSession> session,
    required ShellNavigator navigator,
  });
  void start();
  void stop();
}

/// The shell's own routes: root, login, forbidden and step-up.
final class ShellRoutes {
  ShellRoutes({
    required ShellPaths paths,
    required ValueNotifier<UserSession> session,
    required ShellNavigator navigator,
    required StepUpRequests stepUp,
    required Future<void> Function() onSignOut,
    required List<DemoProfile> demoProfiles,
    Clock clock = systemClock,
    IdentityConnection? connection,
  });
  List<RouteBase> build();
}

final class ShellHost {
  /// Composition from ready pieces. Tests of one piece use this.
  ShellHost.compose({
    required this.platform,
    required this.registry,
    required this.session,
    required this.runtime,
    required this.router,
    required this.navigator,
    required this.badges,
    required this.stepUp,
    required this.scaffoldMessengerKey,
    this.binding,
    this.connection,
  });

  /// Same arguments as today: builds every piece in the right order.
  factory ShellHost({
    required AppPlatform platform,
    required List<MicrofrontendManifest> manifests,
    required ShellScaffoldBuilder scaffold,
    IdentityConnection? connection,
    List<DemoProfile> demoProfiles = DemoProfile.values,
    Clock clock = systemClock,
    DeferredLibraryLoader? loader,
  });
}
```

For the apps:

```dart
final class ShellDestination {
  const ShellDestination({
    required this.path,
    required this.label,
    required this.icon,
    required this.selectedIcon,
    this.badge,
  });
  final String path, label;
  final IconData icon, selectedIcon;
  final int? badge;
}

/// What a scaffold draws, decided once and tested without widgets. The
/// selected entry is the one with the longest path that matches [location]
/// on a segment boundary (`/tasks2` does not select `/tasks`).
final class ShellMenuModel {
  ShellMenuModel({
    required List<MenuEntry> entries,
    required String location,
    required String languageCode,
    required int? Function(MenuEntry entry) badgeFor,
    this.maxPrimary = 4,
  });

  final int maxPrimary;
  List<ShellDestination> get primary;
  List<ShellDestination> get overflow;
  bool get hasOverflow;

  /// Index in [primary]; the "More" slot when the selection is in [overflow];
  /// -1 when nothing matches.
  int get selectedIndex;
  String? pathAt(int index);
}

final class IdentityConnectionFactory {
  const IdentityConnectionFactory({
    required this.baseUrl,
    required this.transport,
    required this.tokenStore,
  });

  final String baseUrl;
  final HttpTransport Function() transport;
  final TokenStore Function() tokenStore;

  /// Null when [baseUrl] is empty (demo mode).
  IdentityConnection? create();
}
```

### 3.14 `MfaState` (auth)

It replaces `_busy`, `_errorCode`, `_pending` and `_challenge` in `MfaFlow`. A step (`MfaStep`) is never busy or in error; `MfaBusy` and `MfaFailed` wrap it.

```dart
sealed class MfaState {
  const MfaState();

  PendingMfa? get pending;
  MfaChallenge? get challenge;
  String? get errorCode;
  bool get isBusy;
}

sealed class MfaStep extends MfaState {
  const MfaStep();
}

/// Credentials step, or nothing pending.
final class MfaIdle extends MfaStep { const MfaIdle(); }

/// The server asked for a second factor; the user picks a method.
final class MfaAwaitingMethod extends MfaStep {
  const MfaAwaitingMethod(this.pending);
  @override
  final PendingMfa pending;
}

/// A challenge is active; the user types the code.
final class MfaAwaitingCode extends MfaStep {
  const MfaAwaitingCode(this.pending, this.challenge);
  @override
  final PendingMfa pending;
  @override
  final MfaChallenge challenge;
}

/// A call is in flight; [step] is where the flow was.
final class MfaBusy extends MfaState {
  const MfaBusy(this.step);
  final MfaStep step;
}

/// The last call failed with [code]; [step] is where the flow goes back to.
final class MfaFailed extends MfaState {
  const MfaFailed(this.code, this.step);
  final String code;
  final MfaStep step;
}

abstract base class MfaFlow extends ChangeNotifier {
  MfaFlow({MfaState initial = const MfaIdle()});
  MfaState get state;
  // Legacy until wave 4, derived from [state]: pending, challenge, errorCode, busy.
}
```

The `shell_host` widgets do an exhaustive `switch (flow.state)`. The comments in `auth/flows` move to English.

### 3.15 `test_utils`

Today it exports 3 auth fakes and the library preloader. It adds what seven harnesses repeat. `test_utils` depends on `ui` (for `AppTheme` and `StatusColors`), `i18n`, `utils` and `go_router`, in addition to what it already has.

```dart
// Builds MaterialApp or MaterialApp.router with the shared delegates, a
// session and the theme. Replaces the seven copies of testApp/pumpApp.
final class TestApp {
  const TestApp({
    this.locale = const Locale('es'),
    this.delegates = const [],
    this.session,
    this.clock,
  });

  final Locale locale;

  /// Delegates of the microfrontend under test, added to the shared ones.
  final List<LocalizationsDelegate<Object?>> delegates;
  final UserSession? session;
  final Clock? clock;

  Widget wrap(Widget home);
  Widget wrapRouter(GoRouter router);
  Future<void> pump(WidgetTester tester, Widget home);
}

final class SessionBuilder {
  SessionBuilder({String userId = 'user-1', String tenantId = 'tenant-1'});
  SessionBuilder.anonymous();

  SessionBuilder withPermissions(Iterable<Permission> permissions);
  SessionBuilder withRoles(Iterable<PlatformRole> roles);
  SessionBuilder withFeatures(Iterable<PlanFeature> features);
  SessionBuilder withFlags(Iterable<FeatureFlag> flags);
  SessionBuilder mfaVerifiedAt(DateTime at);
  UserSession build();
}

abstract final class ProblemFixtures {
  static ProblemDetails unavailable({String traceId = 'trace-123'});
  static ProblemDetails forbidden({String traceId = 'trace-123'});
  static ProblemDetails notFound({String traceId = 'trace-123'});
  static ProblemDetails withCode(String code, {int status = 400});
}

/// A scope over demo services, with the repository already registered.
final class TestScope {
  TestScope({String userId = 'user-1', ShellMode mode = ShellMode.demo});
  MicrofrontendScope get scope;
  TestScope with<T extends Object>(T repository);
}

/// Runs the four tap-target and contrast guidelines on what is on screen.
Future<void> expectAccessible(WidgetTester tester);

/// Pumps [home] at each width and calls [check] with it.
Future<void> pumpAtWidths(
  WidgetTester tester,
  Widget home, {
  List<double> widths = const [320, 800, 1280],
  Future<void> Function(double width)? check,
});

/// Sets the text scale (2.0 for the accessibility check) for the test.
Future<void> pumpAtTextScale(WidgetTester tester, Widget home, {double scale = 2.0});

/// Preloads the deferred libraries of manifests in `setUpAll`.
/// Renamed from `DeferredLibrariesLoader`, which stays as legacy until
/// wave 4 so it is not confused with `DeferredLibraryLoader` of shell_core.
final class DeferredLibrariesPreloader {
  const DeferredLibrariesPreloader();
  Future<void> load(Iterable<MicrofrontendManifest> manifests);
}
```

The tests in `tasks`, `account` and the rest use `TestApp` and delete their `testApp`, `pumpApp`, `loadNow`, `billingSession` and `unavailableProblem`. `setSurface` moves from `ui/test/utils/pump.dart` to `test_utils` only if `ui` does not need it; if it does, it is copied (the cost is a 6-line function, and `ui` cannot depend on `test_utils`).

The test helpers live in `test/utils/` (not `test/support.dart`) as `front-testing` asks.

### 3.16 Shared suite of shell scenarios

It lives in `packages/test_utils/lib/src/shell/scenarios/`. Each app implements a `ShellFixture` that builds its `ShellHost` with its frame; the suite only touches `shell_core` and `auth` types, so `test_utils` does not depend on `shell_host`.

```dart
/// What a scenario needs from the app under test.
abstract interface class ShellFixture {
  /// Pumps the app with [setup] and returns handles to observe it.
  Future<ShellUnderTest> pump(WidgetTester tester, ShellScenarioSetup setup);
}

final class ShellScenarioSetup {
  const ShellScenarioSetup({
    required this.manifests,
    required this.clock,
    this.live = false,
    this.auth,
    this.initialLocation = '/',
  });
  final List<MicrofrontendManifest> manifests;
  final FakeClock clock;

  /// True: a real connection over [auth]. False: demo profiles.
  final bool live;
  final FakeAuthRepository? auth;
  final String initialLocation;
}

final class ShellUnderTest {
  const ShellUnderTest({
    required this.session,
    required this.currentLocation,
    required this.router,
  });
  final ValueNotifier<UserSession> session;
  final String Function() currentLocation;
  final GoRouter router;
}

/// Registers the shared scenarios: sign-in that keeps `from`, sign-out,
/// forbidden page, step-up redirect, step-up of an action, MFA at login,
/// identity switch and deep link after restoring the session.
void defineShellScenarios(ShellFixture fixture, {String platform = 'shell'});
```

Each app keeps only what is its own: its platform's menu, the mobile "More" and `deep_link_mapper`.

### 3.17 New script rules and baseline

`check-structure.mjs` adds these rules, all cheap (regular expressions over `lib/`):

| Rule                                                                                                           | Where it applies                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `Color(0x` or `Colors.`                                                                                        | Microfrontend `lib/` (allowed in `tokens` and `ui/theme`)                                           |
| `catch (` without `on`                                                                                         | All `lib/`, except `contracts`; allowed with the `// catch-all: <reason>` mark on the previous line |
| `Text('` with a literal                                                                                        | `screens/`                                                                                          |
| `widget.repository.`                                                                                           | `screens/`                                                                                          |
| `Alignment.centerLeft`, `Alignment.centerRight`, `EdgeInsets.fromLTRB`, `BorderRadius.circular(` with a number | Microfrontend `lib/`                                                                                |
| `${l10n.` followed by `:` or ` ·`                                                                              | Microfrontend and `ui` `lib/`                                                                       |
| `DateTime.now()`                                                                                               | All `lib/`, except `utils/lib/src/clock.dart` (it already exists, the exception is adjusted)        |
| `: ^` in member `pubspec.yaml` files                                                                           | Everything (after P0.1)                                                                             |

Since those rules would flag code that has not migrated yet, a baseline is added: `front/tools/structure-baseline.json` with the current violations per file and rule. `--all` fails only on violations outside the baseline. `--changed` ignores the baseline for touched files: a file that is touched must end up clean. An entry that no longer applies is a warning, not a failure. No troop in waves 1 to 3 edits the baseline; in wave 4 it is regenerated, checked to be empty and deleted.

## 4. Waves and work packages

### 4.1 Dependencies between waves

The map of waves and troops is in the [plan](README.md#execution-order-by-waves).

Dependencies between waves: wave 1 needs wave 0 (the `utils` `Clock`). Waves 2 and 3 need wave 1 complete (`ui`, `shell_core`, `test_utils`). The microfrontends do not depend on P2.1, which is why they go in waves 2 and 3 with no order among them. P4.1 needs P2.1 and P1.3. P4.2 needs waves 2 and 3 to have migrated everything. P4.3 needs wave 1 (API) and wave 3 (a reference microfrontend).

### 4.2 Wave 0: prelude

It is short: three S packages that prepare the ground and are not touched again.

**P0.1 Clock and versions.** Effort S.

- Folders: `packages/utils/lib/src/clock.dart` and `utils/lib/utils.dart`, `packages/utils/test/clock_test.dart`, `packages/auth/lib/src/session_manager.dart` (only the `typedef`), `packages/test_utils/lib/src/clock/**`, `packages/test_utils/lib/test_utils.dart`, `packages/test_utils/test/clock/**` and every workspace member `pubspec.yaml`.
- Closes: I2 (the `utils` and `auth` part), A2, M3, TU3.
- Produces: `Clock` and `systemClock` in `utils`; `FakeClock` in `test_utils`; dependencies from `auth`, `shell_core`, `shell_host` and `test_utils` to `utils`; exact versions of `go_router`, `intl`, `material_ui`, `flutter_lints`, `lints` and `test`; `sdk: ^3.14.0` in `test_utils`. Consumes: nothing.
- Acceptance: tests of `systemClock` and `FakeClock` (advances, jumps, does not move on its own); `grep -rn ": \^" front --include=pubspec.yaml` returns no workspace members; `pnpm nx run-many -t format-check analyze test --projects=front-utils,front-auth,front-test_utils,front-shell_core,front-shell_host,front-ui,front-i18n`; `pnpm nx run-many -t analyze --projects=front-mf_account,front-mf_assistant,front-mf_backoffice,front-mf_billing,front-mf_notifications,front-mf_tasks,front-mf_verifier,front-web_shell,front-mobile_shell`; `check-structure.mjs --changed .`.
- Haiku 1: `Clock`, `systemClock`, its test, the `auth` `typedef` (replaced by an import) and `FakeClock` with its test. Haiku 2: the `pubspec.yaml` files (exact versions and new dependencies) and the `flutter pub get` check.

**P0.2 Script and baseline.** Effort M.

- Folders: `.claude/skills/front-structure/scripts/**`, `front/tools/structure-baseline.json` (new), `front/tools/nx-plugin/**` (if the script's `analyze` target needs it) and `front/build/`.
- Closes: TL1 (cheap rules) and AP4 (local deletion).
- Produces: the rules in 3.17, the baseline and `--update-baseline`; script tests with `node --test` in `check-structure.test.mjs`. Consumes: nothing.
- Acceptance: `node --test .claude/skills/front-structure/scripts/` with one green and one red case per rule; `check-structure.mjs --all .` passes with the freshly generated baseline; if a new violation is added, it fails; `--changed` rejects a new violation in a touched file even if it is in the baseline.
- Haiku 1: the microfrontend rules (colors, `widget.repository.`, directionality, text). Haiku 2: the rules for `catch`, `DateTime.now()`, `pubspec` versions, the baseline and the tests.

**P0.3 Front ADR.** Effort S.

- Folders: `docs/adr/<number>-*.md` and `docs/adr/README.md`. The number is the next free one; 0024 is already the persistence one (see the open decisions in the [plan](README.md#decision-log)).
- Closes: nothing directly. It records decisions 3.1 to 3.17 as an ADR in "Proposed" status, as `CLAUDE.md` requires for an architecture decision. It moves to "Accepted" in P4.3.
- Acceptance: it follows `docs/adr/0000-template.md`; it links ADR 0012, 0015 and 0018; the index lists the new ADR.
- Haiku 1: context, decision and consequences. Haiku 2: alternatives considered (those in section 1.2) and the index.

### 4.3 Wave 1: foundations

The three packages are additive (except `AccessRule`, see 2.2) and have disjoint folders.

**P1.1 ui, tokens, i18n.** Effort L.

- Folders: `packages/ui/**`, `packages/tokens/**` (includes `design-tokens.json`), `packages/i18n/**`.
- Closes: U1, U2, U3, U4 (the real part), U5, U6, U7, T1, I3 (the `ui` part: `error_view` and the `MetaLine` separator), AC7 (the `context.localeTag` extension).
- Produces: `AsyncValue` (its own file), `AsyncLoader`, `ActionRunner`, `ControllerBuilder`, `showActionResult`, `StatusColors`, `ContentColumn`, `MetaLine`, `context.localeTag`, `ErrorDetails` and `ErrorPresenter` (in `i18n`), `AppRadius.full`, `AppIconSize`, `AppLayout`, the `info` role, button and field themes. Consumes: `utils` only if `ui` needs it (it does not).
- Accessibility changes: `LoadingView` with `Semantics(liveRegion: true, label: l10n.loading)` and `semanticsLabel` on the indicator (the key already exists); the `ErrorView` message in a live region; `AppCard` with `Semantics(button: true)` when there is an `onTap`; the `AppButton` spinner with a label.
- Acceptance (tests per piece):
  - `AsyncLoader`: a stale response does not overwrite a new one; it does not notify after `dispose`; `setData` invalidates a fetch in flight; a `StateError` from the fetch escapes.
  - `ActionRunner`: the three concurrency modes; `Exception` gives `ActionFailed`, `Error` escapes; `dispose` in the middle of an action does not throw.
  - `ControllerBuilder`: creates once, rebuilds on notify, calls `dispose`.
  - `StatusColors`: `textContrastGuideline` in light and dark for each pair; `lerp`.
  - Base components: `meetsGuideline(androidTapTargetGuideline)`, `iOSTapTargetGuideline`, `labeledTapTargetGuideline`, `textContrastGuideline`; a test at 2x scale; `tokens` still matches `design-tokens.json`.
  - `ErrorPresenter`: catalog code, `ContractViolationException`, generic error; `ErrorView` no longer imports `contracts` (empty `grep`).
  - Commands: `pnpm nx run-many -t format-check analyze test --projects=front-ui,front-tokens,front-i18n`; `analyze` and `test` of the seven microfrontends and of `front-shell_host`, `front-web_shell`, `front-mobile_shell` (compatibility); `check-structure.mjs --changed .`.
- Haiku 1: `lib/src/state/**` (`AsyncValue`, `AsyncLoader`, `ActionRunner`), `ControllerBuilder`, `showActionResult` and their tests. Haiku 2: `tokens`, `StatusColors`, themes, accessible components, `ContentColumn`, `MetaLine`, `ErrorPresenter` and ARB. The lead edits `ui.dart`, `tokens.dart` and `i18n.dart`.
- Own risk: the `guard` change breaks tests that use `StateError` as a failure (section 6). The lead lists those tests before starting and changes them in the same package when they belong to `ui`; the microfrontend ones are changed in their wave.

**P1.2 shell_core and utils.** Effort L.

- Folders: `packages/shell_core/**`, `packages/utils/lib/src/money*.dart`, `packages/utils/test/money*`. Agreed exception: one line in each of `microfrontends/{assistant,backoffice,billing,tasks,verifier}/test/manifest_test.dart` to pass `now: DateTime.utc(2026, 1, 1)`.
- Closes: SC1, SC2, SC3, SC4 (document the parameter), I1, M1 (shell part), M2 (shell part), AC5 (the base), B5 (the base); AC2 is left to `account`.
- Produces: `AccessRule` with a required `now`; `DeferredLibraryLoader`; `ShellNavigator`; `ShellRouterFactory`; `ScreenRoute.deferred` and `ScreenParamsX`; `DeferredLocalizations` and `LocalizedOverlays`; `RepositoryBinding`; `DemoBehavior` and `DemoDisposedException`; `MoneyFormatter`. Kept as legacy: `deferredPage`, `resetDeferredPageCache`, `buildShellRouter`, `homeLocation`, `signOutAndGoToLogin` and `redirectFor`. Consumes: `Clock` from P0.1.
- `MoneyFormatter`:

  ```dart
  final class MoneyFormatter {
    MoneyFormatter({required String locale});
    /// Caches the `NumberFormat` per currency; the decimals come from a small
    /// ISO 4217 table, so no second format is built per call.
    String format(MoneyAmount value);
  }
  ```

  `formatMoney` still exists and delegates.

- Acceptance:
  - `access_rule_test`, `mfa_rule_test` and `user_session_test` pass with an explicit `now`; `grep -rn "DateTime.now()" packages/shell_core/lib` empty.
  - `DeferredLibraryLoader`: one load per instance; a failed load is retried; two instances do not share a cache; `page` shows `loading` and then the content.
  - `ScreenRoute.deferred`: the route builds with the scope and the `params` (the path wins); `params.require` throws `StateError` if it is missing.
  - `DeferredLocalizations`: the delegate's text reaches the page and a `showLocalizedDialog`; without `DeferredLocalizations` above it throws a clear error.
  - `RepositoryBinding`: demo and live modes pick their factory; the instance is unique per scope; the scope releases it; `demoOnly` in live mode throws `StateError`.
  - `DemoBehavior`: latency, `failNext` with `count` and per `operation`, `dispose` and `DemoDisposedException`.
  - `ShellNavigator`: `home`, `landing` and sign-out (a `/tasks2` is not a `/tasks`).
  - Commands: `pnpm nx run-many -t format-check analyze test --projects=front-shell_core,front-utils`; `analyze` and `test` of every consumer; `check_deferred_chunks`; `check-structure.mjs --changed .`.
- Haiku 1: `AccessRule` and its callers (`ShellAccessScope`, `context.can`, router and runtime), the access tests and the five `manifest_test` lines. Haiku 2: `DeferredLibraryLoader`, `ScreenRoute.deferred`, `DeferredLocalizations`, `RepositoryBinding`, `DemoBehavior`, `MoneyFormatter` and their tests. The lead writes `ShellNavigator` and `ShellRouterFactory` (they need the pieces of both) and the barrels.

**P1.3 test_utils, auth, api.** Effort M.

- Folders: `packages/test_utils/**`, `packages/auth/**`, `packages/api/**`.
- Closes: TU1 (the pieces), TU2 (the utilities), SH2 (the state), A1, AC6 (`auth/flows` comments).
- Produces: `TestApp`, `SessionBuilder`, `ProblemFixtures`, `TestScope`, `expectAccessible`, `pumpAtWidths`, `pumpAtTextScale`, `DeferredLibrariesPreloader`; `MfaState`, `MfaStep` and subtypes, and `MfaFlow.state` (with the old getters derived). Consumes: `Clock` and `FakeClock` from P0.1, `StatusColors` from P1.1 (for `TestApp`, which uses `AppTheme`) and the current `ScreenRoute` from `shell_core`. Since P1.1 runs at the same time, `TestApp` does not import `StatusColors` directly: it imports `AppTheme`, which already exists. The troop does not depend on the new `ui` code to compile.
- Acceptance: `TestApp.wrap` and `wrapRouter` mount with the given language and delegates; `SessionBuilder` produces sessions equal to the literals it replaces (test with three real cases); `expectAccessible` fails with a 20 px button and passes with a 48 one; `pumpAtTextScale` applies 2x. `MfaFlow`: transitions from `MfaIdle` to `MfaAwaitingMethod`, to `MfaAwaitingCode`, `MfaBusy` and `MfaFailed` on each error code in `_challengeResetCodes`; a `TypeError` comes out as is and releases the busy state. `session_manager.dart:292` uses `on Exception` and the refresh tests stay green. Commands: `pnpm nx run-many -t format-check analyze test --projects=front-test_utils,front-auth,front-api`; `analyze` and `test` of `front-shell_host` and of the `test_utils` consumers; `check-structure.mjs --changed .`.
- Haiku 1: `TestApp`, `SessionBuilder`, `ProblemFixtures`, `TestScope` and tests. Haiku 2: `expectAccessible`, `pumpAtWidths`, `pumpAtTextScale`, the preloader, `MfaState` and `A1`.

### 4.4 Wave 2: shell and two large microfrontends

**P2.1 shell_host.** Effort L.

- Folders: `packages/shell_host/**`.
- Closes: SH1, SH2 (the widgets), SH3, SH4 (`// catch-all:` comment), AP1 (the model), AP3 (the factory).
- Consumes: `ShellNavigator`, `ShellRouterFactory`, `DeferredLibraryLoader` (P1.2); `MfaState` (P1.3); `Clock`. Produces: `MenuBadges`, `SessionBinding`, `ShellRoutes`, `ShellHost.compose` and the `factory ShellHost`, `ShellMenuModel`, `ShellDestination`, `IdentityConnectionFactory`; forms with `switch (flow.state)`, `MfaErrorText` as a live region, `textInputAction` and `keyboardType: number` on the code field. `shellScreenLoader` stays as legacy.
- Acceptance: `shell_host_test` passes with no behavior changes; new tests per piece (`MenuBadges` counts and resets with the identity; `SessionBinding` signs out when identity closes the session; `ShellRoutes` redirects `/step-up` to login for anonymous users; `ShellMenuModel` with `/tasks`, `/tasks2`, `/tasks/42`, overflow and no selection); `IdentityConnectionFactory.create()` returns null with an empty `baseUrl`; the forms pass `expectAccessible`. Commands: `pnpm nx run-many -t format-check analyze test --projects=front-shell_host`; `analyze` and `test` of `front-web_shell` and `front-mobile_shell` (the `factory` must not break them); `check-structure.mjs --changed .`.
- Haiku 1: `MenuBadges`, `SessionBinding`, `ShellRoutes`, `ShellHost.compose`, the `factory` and their tests. Haiku 2: `ShellMenuModel`, `ShellDestination`, `IdentityConnectionFactory` and the pages (SH2, SH3) with their tests. The lead reviews the build order of the `factory` (the router needs the routes, which need the navigator, and the runtime needs `signOut` and `requestStepUp`).

**P2.2 account.** Effort L.

- Folders: `microfrontends/account/**`.
- Closes: AC1, AC2, AC3, AC4, AC5, AC6, AC7 (usage), I3 (in its files: `sessions_screen`, `devices_screen`, `agreements_screen`), M1 and M2 (usage), TU1 (its harness), TU2 (one accessibility test per screen).
- Consumes: `AsyncLoader`, `ActionRunner`, `ControllerBuilder`, `showActionResult`, `ContentColumn`, `MetaLine`, `context.localeTag` (P1.1); `ScreenRoute.deferred`, `DeferredLocalizations`, `RepositoryBinding`, `DemoBehavior` (P1.2); `TestApp`, `SessionBuilder`, `ProblemFixtures`, `FakeClock`, `expectAccessible` (P1.3). Produces: five controllers and `StepUpGate`; `AccountData` (binding); `FakeAccountRepository` with `DemoBehavior` and a clock; `AccountScreens`; manifest with `.deferred`. Removes: `runAccountAction`, `confirmStepUp`, `runSensitiveAction`, `AccountAsyncView`, `_localized`, `_repository`, its own `localeTag`.
- Acceptance: each controller with its widget-free test (load, error, action, `ActionSkipped` when the step-up is declined, a quick `reload` after closing a session does not overwrite new data: that is the AC1 bug); `closeOthers` returns the number and there is no longer a mutable `closed` in a closure; the session list is centered and has a maximum width at 1280 (`pumpAtWidths`); `Alignment.centerRight` becomes `AlignmentDirectional.centerEnd`; the seven `DateTime.now()` calls are gone; `check-structure.mjs --changed .` green without a baseline for its files; `check_deferred_chunks`. Command: `pnpm nx run-many -t format-check analyze test --projects=front-mf_account`.
- Haiku 1: Sessions, Devices and Overview (controller, screen, tests). Haiku 2: Security, Agreements, `StepUpGate`, the fake with `DemoBehavior` and a clock, `AccountData`. The lead does the manifest, `AccountScreens`, the ARBs (I3 placeholders) and the harness.

**P2.3 backoffice.** Effort L.

- Folders: `microfrontends/backoffice/**`.
- Closes: B0 to B5, I3 (20 sites), M1 and M2 (usage), TU1 and TU2 (its harness and its accessibility).
- Consumes: the same as P2.2 without `StepUpGate`. Produces: `SagasController`, `SagaDetailController` (with `Future.wait` of the saga and its log), `DlqController`, `TenantsController`, `TenantDetailController`, `OverviewController`; `BackofficePage` with `CustomScrollView` and `SliverList`; section navigation with a `SegmentedButton` or `NavigationBar` that marks the current one; the fake with `DemoBehavior`. Removes: `AsyncBody`, `BackofficeLocalized`, `showBackofficeDialog`, `_SectionNav` with `TextButton`.
- Acceptance: one controller per screen with its test (`DlqController.retry` reloads both lists and returns `ActionResult`); `SagaDetailController` does both loads in parallel (test with a fake that records the start order); dialogs show the text from the backoffice ARB (`showLocalizedDialog`); the current section has `Semantics(selected: true)`; long lists use lazy loading; `Alignment.centerLeft`, `BorderRadius.circular(12)` and the `1100` go away in favor of `AlignmentDirectional`, `AppRadius.md` and `AppLayout.wideContentWidth`. The backoffice ARBs do not appear in the initial bundle (`check_deferred_chunks`, which already watches them). Command: `pnpm nx run-many -t format-check analyze test --projects=front-mf_backoffice`.
- Haiku 1: Sagas, SagaDetail and Overview. Haiku 2: Dlq, Tenants, TenantDetail and `BackofficePage`. The lead: manifest, ARB (I3 is the largest concentration), fake and harness.

### 4.5 Wave 3: four microfrontends

**P3.1 billing and notifications.** Effort L.

- Folders: `microfrontends/billing/**`, `microfrontends/notifications/**`.
- Closes: BI1, BI2, BI4, N1, N2, N3, I3 (billing), I4 (billing), AC7 (billing), M1 and M2 (usage), TU1 and TU2. BI3 is discarded.
- Produces: `BillingPlanController`, `InvoicesController`, `InvoiceDetailController`, `ChangePlanController` and `ChangePlanState`; `InboxController` (with `_requestId`, an arrivals buffer, reverting only `read`); `PreferencesController` (one save at a time, the latest wins, with `ActionRunner(concurrency: ActionConcurrency.serial)`); `StatusChip` and `UsageMeter` with `StatusColors`; fakes with `DemoBehavior`. Removes: `billing_colors.dart`, its own `localeTag`, `SizedBox(height: 160, ...)` in favor of `ConstrainedBox(minHeight:)`, `EdgeInsets.fromLTRB` in favor of `EdgeInsetsDirectional.only`, `BorderRadius.circular(999)` in favor of `AppRadius.full`.
- Acceptance: BI1 first, as its own commit (delete `billing_colors.dart`; contrast test of the chip and meter in light and dark with `textContrastGuideline`). `InboxController`: tapping "retry" twice does not mix two loads; if a live notification arrives while saving and the save fails, the notification stays in the list and only `read` is reverted (the N1 bug). `PreferencesController`: two changes in a row give two saves in order; if the first one fails, the second change is not erased. Billing's `test/utils/test_app.dart` goes away in favor of `TestApp` and the `supportedLocales` of `i18n`. Command: `pnpm nx run-many -t format-check analyze test --projects=front-mf_billing,front-mf_notifications`.
- Haiku 1: billing (BI1 first, then the four controllers). Haiku 2: notifications (Inbox, Preferences, fake with `DemoBehavior`). The lead: manifests, ARBs and harness of both.

**P3.2 tasks and verifier.** Effort M.

- Folders: `microfrontends/tasks/**`, `microfrontends/verifier/**`.
- Closes: TK1 to TK5, V1, V2, V3, I3 (whatever there are), M1 and M2 (usage), TU1 and TU2.
- Produces: `TaskFormController` and `TaskFormState`; `TaskDetailController` and `TaskDetailState`; `UuidV7Generator` with its file and its test; `TasksListController` with `selectedId` (TK3); `FakeTasksRepository` with `DemoBehavior` and `UuidV7Generator`; `VerifierController`, `VerifierState` and the injectable tick; `verifier_widgets.dart` with the countdown in `Semantics` and the announcement only at 10 s and at 0 with `SemanticsService.sendAnnouncement`; `disableAnimations` on the bar. Removes: `builders.dart` and `_localized`, `loadNow`, `unavailableProblem`, and uses the `AppLayout` already in `tokens` (it replaces the `360`). Moves `test/support.dart` of `tasks` and `verifier` to `test/utils/` or deletes it in favor of `TestApp`, and splits `tasks_screens_test.dart` (467 lines) into `test/screens/<screen>_test.dart`.
- Acceptance: `VerifierController` with `FakeClock`: the countdown comes from `expiresAt` and does not drift if the clock jumps 30 s; blocked, denied and a new challenge reset the state without a visible `_generation`; `copied` goes back to `false` when the challenge changes. `TaskDetailController`: a stale response does not overwrite a new one; an external change during deletion does not resurrect the task. `TaskFormController`: `TaskFormSaved` is the only state that navigates. The ids generated by `UuidV7Generator` are valid UUIDv7 and ordered with the test clock. Command: `pnpm nx run-many -t format-check analyze test --projects=front-mf_tasks,front-mf_verifier`.
- Haiku 1: tasks. Haiku 2: verifier. The lead: manifests, binding and splitting the large test.

**P3.3 assistant.** Effort M.

- Folders: `microfrontends/assistant/**`.
- Closes: AS1 to AS6, M1 and M2 (usage), TU1 and TU2.
- Produces: `AssistantAccess` in `shared/constants/assistant_access.dart` (AS1); `AssistantChatController` with `ChatState`, `AnswerState`, `ChatFailureKind`, `_requestId` in `load()` and `Object? takeError()` (AS2, AS3); `ChatBubble` in its own file (one file, one class); auto-scroll only if the user was at the bottom (AS4); `labelText` on the field, an announcement with `SemanticsService.sendAnnouncement` when the answer finishes and not per chunk (AS5); `AppSpacing`, `AppLayout` or its own constants instead of `sm + 4`, `md - 2`, `640` (AS5); tests with a `Completer` per chunk or `fakeAsync` instead of `Future.delayed` of 90 and 300 ms (AS6).
- Acceptance: a double `load()` does not overwrite; a `send` during a load does not overwrite it; `isStreaming` comes from the state; an exceeded quota gives `ChatFailureKind.quotaExceeded` and the screen only maps it to text; `grep -rn "Future<void>.delayed" microfrontends/assistant/test` empty; `expectAccessible` passes. Command: `pnpm nx run-many -t format-check analyze test --projects=front-mf_assistant`.
- Haiku 1: controller, states and their tests (with the `Completer`s). Haiku 2: `ChatBubble`, the screen, `AssistantAccess`, scrolling and accessibility.

### 4.6 Wave 4: apps, removal and guide

**P4.1 apps and scenario suite.** Effort L.

- Folders: `apps/web/**`, `apps/mobile/**`, `packages/test_utils/**`.
- Closes: AP1 (usage), AP2, AP3 (usage), TU1 (rest).
- Consumes: `ShellMenuModel`, `IdentityConnectionFactory`, `ShellHost` (P2.1), `TestApp`, `FakeClock`, `FakeAuthRepository` (P1.3). Produces: the `defineShellScenarios` suite (3.16) and the two `ShellFixture`s; scaffolds that only paint a `ShellMenuModel`; `webIdentityConnection` and `mobileIdentityConnection` as a call to `IdentityConnectionFactory`. Removes: `DeferredLibrariesLoader` (`DeferredLibrariesPreloader` remains) and `host.signOut()` without `await` in a lambda (it is wrapped with `unawaited`).
- Acceptance: `web_shell_test.dart` and `mobile_shell_test.dart` drop from 1371 lines to what is specific to each platform (menu, "More", `deep_link_mapper`); the suite's 8 scenarios run in both apps; the `/tasks2` test passes on mobile; `check-structure.mjs --changed .`; `flutter build web --release --source-maps` and `check_deferred_chunks`. Command: `pnpm nx run-many -t format-check analyze test --projects=front-web_shell,front-mobile_shell,front-test_utils`.
- Haiku 1: the suite and the web fixture. Haiku 2: the mobile fixture and scaffold, and `IdentityConnectionFactory` in both apps. The lead: the web scaffold and a review that the suite covers every scenario that has a test today (a scenario-by-scenario table before deleting).

**P4.2 removal of legacy code and script.** Effort M.

- Folders: `packages/shell_core/**`, `packages/shell_host/**`, `packages/ui/**`, `packages/auth/**`, `front/tools/**` except `new_microfrontend*`, `.claude/skills/front-structure/scripts/**`.
- Closes: the closing of SC2, SH1, SH2, M1, TL1 and the removal of the whole legacy list.
- Removes: `deferredPage`, `resetDeferredPageCache`, `buildShellRouter`, `homeLocation`, `signOutAndGoToLogin`, `redirectFor` and `shellScreenLoader`; the old `MfaFlow` getters and the `Clock` re-export in `auth`; the two old uses of `ErrorView`/`AsyncValueView` that remain. The starting guide is the compiler: delete and fix until `analyze` of the whole workspace is clean.
- Acceptance: `check-structure.mjs --all .` green with the baseline regenerated and empty, and then `structure-baseline.json` is deleted (or stays as `[]` if the user prefers to keep the mechanism); `pnpm nx run-many -t format-check analyze test --projects=` with every front project green; `check_deferred_chunks`; `grep` for each legacy symbol empty.
- Haiku 1: removal in `shell_core`, `shell_host` and `auth`. Haiku 2: the baseline, the script and a review that none of the 3.17 rules has a forgotten exception.

**P4.3 skills, ADR and generator.** Effort M.

- Folders: `.claude/skills/front-*/**` (except `front-structure/scripts/`), `.claude/skills/front-new-microfrontend/**` (new), `front/tools/new_microfrontend.dart`, `docs/adr/0018-*.md`, the front ADR, `docs/ARCHITECTURE.md`.
- Produces: the `front-code`, `front-testing`, `front-accessibility`, `front-adaptive-layout` and `front-i18n` skills updated with `AsyncLoader`, `ActionRunner`, `ControllerBuilder`, `StatusColors`, `TestApp`, `expectAccessible`, `DeferredLocalizations` and `ScreenRoute.deferred`; ADR 0018 with the new way to declare screens; the front ADR in "Accepted"; the generator:

  ```dart
  /// `dart run front/tools/new_microfrontend.dart reports --menu "Reportes"`
  final class MicrofrontendScaffolder {
    MicrofrontendScaffolder({required Directory frontRoot, required String id});

    /// Writes the package, adds it to `front/pubspec.yaml`, and returns the
    /// files it created plus the two lines to add to each app.
    ScaffoldResult create({required String menuLabelEs, required String menuLabelEn});
  }
  ```

- Acceptance: the generator creates `reports`, and `flutter pub get`, `analyze` and `test` of `front-mf_reports` pass without manual editing; `check-structure.mjs --all .` and `check_microfrontend_boundaries` pass; after creating it, it is deleted (it is a test, not versioned). Each updated skill is reviewed against the real code.
- Haiku 1: the generator and its test. Haiku 2: skills and ADR.

## 5. Order and troops

There are at most three front troops per wave. The composition of each troop and the rule for advancing between waves are in the [plan](README.md#how-a-wave-ran).

| Wave | Troops               | Critical path          | Total effort |
| ---- | -------------------- | ---------------------- | ------------ |
| 0    | 3 (P0.1, P0.2, P0.3) | P0.2                   | S + M + S    |
| 1    | 3 (P1.1, P1.2, P1.3) | P1.1 and P1.2 (L each) | L + L + M    |
| 2    | 3 (P2.1, P2.2, P2.3) | all three are L        | L + L + L    |
| 3    | 3 (P3.1, P3.2, P3.3) | P3.1                   | L + M + M    |
| 4    | 3 (P4.1, P4.2, P4.3) | P4.1                   | L + M + M    |

Total: 15 packages in 5 waves. Wave 4 can start P4.3 (docs and generator) as soon as wave 3 ends. P4.1 and P4.2 do not touch the same files: P4.2 does not edit `test_utils`, and P4.1 does not edit the P4.2 packages.

When integrating a wave, the general runs `flutter pub get`, `pnpm nx run-many -t format-check analyze test --projects=<the whole front>` and `check_deferred_chunks`.

## 6. Risks and what is left out

### 6.1 Risks

- **`guard` with `on Exception`.** A test that throws `StateError` as a failure now sees the error escape. Mitigation: each lead searches for `StateError(` in its tests at the start and replaces it with a typed test `Exception`, defined once in `test_utils`.
- **Legacy code stays.** Without `@Deprecated` nobody sees the warning. Mitigation: P4.2 is its own troop, it is guided by the compiler and the script, and this section's legacy list is its acceptance criterion.
- **Barrels and `pubspec.yaml`.** They are the only point where two troops could collide. Mitigation: only the lead edits them and the folder list declares it.
- **A visual change from the minimum of 48.** On desktop, buttons go from 40 to 48 high. Mitigation: it is decided beforehand (8.2); it is a theme change, easy to revert.
- **Deferred chunks.** A new class in the wrong package can pull a microfrontend's code into the initial bundle. Mitigation: `TasksData`, the controllers and the screens go in deferred folders; `check_deferred_chunks` runs in every package that touches manifests or screens.
- **`test_utils` and `auth` cycle.** It already exists and works. Mitigation: `ui` is added as a dependency of `test_utils` only if `nx graph` does not flag a new cycle; if it does, `TestApp` receives the `ThemeData` as a parameter.
- **Similar names.** `DeferredLibraryLoader` (shell_core) and `DeferredLibrariesLoader` (test_utils) get confused. That is why the second one becomes `DeferredLibrariesPreloader`.
- **The Haikus follow instructions literally.** An ambiguous signature gives code that compiles and does not do what was asked. Mitigation: the skeleton with `UnimplementedError` and the tests named in each package; the lead reviews the diff against the signatures in section 3.
- **Shared ARBs.** Only P1.1 touches `i18n` in waves 1 to 3. If a microfrontend needs a new shared key, it asks P4.2 for it.
- **Tests with real time.** `Future.delayed` in the assistant tests and delays in the fakes. Mitigation: `DemoBehavior(delay: Duration.zero)` by default in tests and `FakeClock`.

### 6.2 Out of scope

- **Hardening `analysis_options.yaml`** (`strict-casts`, `unawaited_futures`, `public_member_api_docs`...): the `front-analysis` skill asks for its own change with every package green, and it is not known how many warnings will appear. It comes after this plan.
- **Golden tests:** the skill marks them optional. They are covered with `expectAccessible`, `pumpAtWidths` and `pumpAtTextScale`.
- **Manual review with a screen reader** (TalkBack, VoiceOver, Tab on web): it cannot be automated. It is noted per screen in each package as a review owned by the user.
- **TL2, TL3, A3:** see 1.3.
- **`packages/contracts`, `packages/api` (except reading types), `layout/*`, `tokens/lib/src/scales.dart`, the body of `contracts_gen`:** the report did not review them and this plan does not touch them. That is not the same as "no findings".
- **Real adapters for `tasks`, `notifications` and the rest:** today they are demo. This plan adds no real data.
- **A single version catalog:** pub does not allow it. It is pinned per file.

## 7. Creating a new microfrontend after the change

Example: `reports`, with a list and a detail, demo data and no real API yet.

1. Run the generator: `dart run front/tools/new_microfrontend.dart reports --menu "Reportes"`. It creates the package with `pubspec.yaml`, `lib/mf_reports.dart`, the `data`, `screens`, `shared`, `l10n` and `test/utils` folders, and adds the member to `front/pubspec.yaml`. It prints the two lines that go in each app.
2. Add the manifest to `apps/web/lib/main.dart` and to `apps/mobile/lib/main.dart` (1 line in each).
3. Write what is specific to the domain.

What is written by hand, with an estimate of lines against today's code (taking `tasks` and `notifications` as reference):

| Piece                                          | Today                                                | After                                                                   |
| ---------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------- |
| `mf_reports.dart` (id, access, menu, 2 routes) | about 80                                             | about 35 (`ScreenRoute.deferred`, no `_loading`)                        |
| Bridge to the screens (`ReportsScreens`)       | about 50 (`_localized`, `_repository`, 3 `build...`) | about 14 (`DeferredLocalizations` and `scope.repository`)               |
| Repository binding                             | about 8 repeated in each `screens.dart`              | 6 (`ReportsData`)                                                       |
| Fake with latency and failures                 | about 50 of plumbing plus the data                   | about 8 of plumbing (`DemoBehavior`) plus the data                      |
| A screen controller                            | 25 spread across the `State`                         | about 30, with `AsyncLoader` and `ActionRunner`, tested without widgets |
| Test harness                                   | 70 to 120 per microfrontend                          | 0 to 10 (`TestApp`, `SessionBuilder`, `ProblemFixtures`)                |
| Routes, access and enums                       | about 25                                             | about 25 (unchanged: it is domain)                                      |
| ARB                                            | about 20                                             | about 20                                                                |

In total: about 60 lines of glue (manifest, bridge and binding) that the generator already writes, against about 250 today between repeated glue and plumbing. What remains to write is the domain: the repository port (about 20 lines), the demo data, a controller and a screen per route, the texts and the tests of each controller and each screen.

Minimal outline of the two glue pieces:

```dart
// lib/mf_reports.dart
final MicrofrontendManifest reportsManifest = MicrofrontendManifest(
  id: reportsId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: ReportsAccess.read,
  modes: const {ShellMode.demo},
  menu: const [MenuEntry(label: reportsMenuLabel, path: ReportsPaths.list, order: 30, icon: Icons.bar_chart_outlined, selectedIcon: Icons.bar_chart)],
  screens: [
    ScreenRoute.deferred(
      ReportsPaths.list,
      library: screens.loadLibrary,
      build: (scope, params) => screens.ReportsScreens().list(scope),
      routes: [
        ScreenRoute.deferred(
          ':${ReportsPaths.idParam}',
          library: screens.loadLibrary,
          build: (scope, params) => screens.ReportsScreens().detail(scope, params.require(ReportsPaths.idParam)),
        ),
      ],
    ),
  ],
);

// lib/src/screens/reports_screens.dart (deferred)
final class ReportsScreens {
  const ReportsScreens();

  Widget list(MicrofrontendScope scope) => DeferredLocalizations(
    delegates: const [ReportsLocalizations.delegate],
    child: ReportsListScreen(repository: scope.repository(ReportsData.repository)),
  );

  Widget detail(MicrofrontendScope scope, String id) => DeferredLocalizations(
    delegates: const [ReportsLocalizations.delegate],
    child: ReportDetailScreen(repository: scope.repository(ReportsData.repository), reportId: id),
  );
}
```

Checklist for the new microfrontend, which the reviewer verifies:

- No screen has a `State` with a `Future`, `try/catch` or `widget.repository.` (the script flags it).
- Each controller uses `AsyncLoader` and `ActionRunner`, and its test does not mount widgets.
- Each screen has a test of its four states, one compact width and one expanded, `expectAccessible` and one at 2x scale.
- Colors from `Theme` and `context.statusColors`; texts from the ARB with placeholders; `AlignmentDirectional` and `EdgeInsetsDirectional`.
- `check_microfrontend_boundaries` and `check_deferred_chunks` green.

## 8. Decisions approved by the user

1. **Exact versions per file (M3).** Pub has no single catalog. Proposal: pin the exact number in each `pubspec.yaml` and watch it with the script. Alternative: change the `front-structure` skill to accept `^`.
2. **Minimum of 48 on all buttons and fields (U4/U5).** The skill accepts 24 as the floor on web with a pointer. Proposal: 48 across the whole theme, for uniformity and for mobile. Cost: 48-high buttons on desktop too.
3. **`i18n` depends on `contracts` (U6).** Proposal: the mapping from errors to text lives in `i18n`, which already has `errorMessage`, and `ui` stops importing `contracts`. Alternative: a new `errors` package, cleaner but one more workspace member.
4. **`ControllerBuilder` in `ui`.** Proposal: a widget that creates and closes the controller, so the 27 screens are `StatelessWidget`. Alternative: keep a minimal `State` per screen that only does `initState` and `dispose`.
5. **`ActionResult` with three outcomes and `ActionConcurrency`.** The report proposes two (`ActionSucceeded`, `ActionFailed`). Proposal: add `ActionSkipped` (step-up declined, action already running) and three concurrency modes, because `PreferencesController` needs to serialize and `closeOthers` needs to tell "did not run" from "failed".
6. **Legacy code is removed at the end, without `@Deprecated` (2.2).** Proposal: a `Legacy` comment and a wave of its own for removal. Cost: the old and new APIs coexist until wave 4.
7. **The scenario suite lives in `test_utils` and not in `shell_host/test` (3.16).** It is the only location both apps can import.
8. **The `backoffice` dialogs are fixed with `showLocalizedDialog` and not with `useRootNavigator: false` (B5).** The report's proposal does not work.
9. **Baseline for the script's new rules (3.17).** Proposal: the rules go in now, with a baseline that is emptied in wave 4. Alternative: add them at the end, but then nothing protects the code that waves 1 to 3 write.
10. **`StepUpGate` in `account` and not in `shell_core` (3.11).** Only account uses it today.
11. **Out of scope:** hardening `analysis_options.yaml` as a separate change (6.2).
