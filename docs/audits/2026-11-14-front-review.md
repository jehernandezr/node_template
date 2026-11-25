# node_template front review

Read-only review of `front/` (packages, microfrontends, apps and tools) against the `front-*` skills and what the user requires. Paths are relative to `/Users/jonatan/Documents/projects/node_template/front`. Effort: S (less than half a day), M (1 to 2 days), L (more than 2 days).

## Executive summary

The `check-structure.mjs --all` script reports 3 violations, all of them `DateTime.now()` in logic: `microfrontends/account/lib/src/data/fake_account_repository.dart`, `microfrontends/tasks/lib/src/data/fake_tasks_repository.dart` and `packages/shell_core/lib/src/access_rule.dart`. It is only the tip.

What the script does not see and weighs more:

1. The "widgets that only paint" rule holds in 2 of 27 screens. There are 25 `State` classes with screen logic, 51 calls to `widget.repository.` inside widgets and 24 `try/catch` blocks in `screens/`. Only two controllers exist (`TasksListController` and `AssistantChatController`) in the whole front.
2. Zero verifiable accessibility: there is not a single `Semantics` in `lib/`, only 3 `tooltip`, and no test uses `meetsGuideline`, text scale or golden.
3. Creating a new microfrontend requires copying about 6 nearly identical code blocks (`_localized`, `_repository`, `localeTag`, deferred routes, test harness, fake with latency and failures).
4. The theme discards the `success` and `warning` roles that do exist in `tokens`, and `billing` redefines them with fixed colors.
5. `shell_core` and `shell_host` use top-level functions with dependencies and a mutable global cache; `ShellHost` is a class with too many responsibilities.
6. Texts are composed by concatenation (`'${l10n.x}: ${valor}'`) in at least 35 places, against the i18n rule.

I did not review in depth: `packages/contracts` (generated), `packages/api`, `packages/ui/lib/src/layout/*` except `app_page` and `platform_screen`, `tokens/lib/src/scales.dart`, or the body of `tools/contracts_gen`. I say so that it is not read as "no findings".

---

## packages/ui

**U1. High, M. `AsyncValue` lives in a widget file and its `guard` catches `Error`.**
`packages/ui/lib/src/components/async_value_view.dart:7-76` defines the state type for the whole front inside the widget file, and `guard` (line 36) uses `catch (error, stackTrace)` without `on Exception`, which hides programming errors (`TypeError`, `StateError`). The `front-code` skill forbids it.
Proposal: move `AsyncValue`, `AsyncLoading`, `AsyncData`, `AsyncError` to `src/state/async_value.dart` and change `guard` to `on Exception`. Add `map`/`when` with an exhaustive `switch` instead of `valueOrNull` everywhere.

**U2. High, M. The generic controller that would avoid 20 `State`s with the same logic is missing.**
Twelve screens repeat `_load()` / `_reload()` / `if (!mounted) return; setState(...)` and only `task_detail_view.dart:39` discards stale responses with `_requestId`. See the detail per microfrontend.
Proposal: in `ui`, a class `final class AsyncLoader<T> extends ChangeNotifier` with constructor `AsyncLoader(Future<T> Function() load)`, `value` (`AsyncValue<T>`), `load()`, `reload()`, `_requestId` and `_disposed`. Widgets move to `ListenableBuilder(listenable: loader, ...)`. Complement it with `ActionRunner` (see U3).

**U3. High, M. `showActionError` and the action `try/catch` blocks are spread across widgets.**
`packages/ui/lib/src/components/action_error.dart:26` is a top-level function that receives `BuildContext`; every microfrontend wraps the same pattern (`runAccountAction` in `account_widgets.dart:133`, `_markOptimistically` in `inbox_screen.dart:104`, etc.).
Proposal: an `ActionRunner` class (without `BuildContext`) with `Future<ActionResult> run(Future<void> Function())` that returns a `sealed ActionResult` (`ActionSucceeded`, `ActionFailed(error)`). The controller uses it and exposes the result; the widget only calls `showActionError` when it sees `ActionFailed`.

**U4. High, S. Accessibility of the base components.**

- `packages/ui/lib/src/components/loading_view.dart:20-27` and `app_button.dart:55-58`: the spinner has no label or live region; a screen reader does not announce "loading". Proposal: `Semantics(liveRegion: true, label: l10n.loading, child: ...)` and `CircularProgressIndicator(semanticsLabel: ...)`. Requires adding `loading` to the shared ARB.
- `error_view.dart:92` and `empty_state.dart:49`: decorative 48 icons without `excludeSemantics`. Proposal: `ExcludeSemantics` (they are not actionable) and wrap the error message in `Semantics(liveRegion: true)`.
- `app_card.dart:36`: `InkWell` without `Semantics(button: true)`. Proposal: wrap it when `onTap != null`.
- `app_button.dart:67-84`: does not set a `minimumSize` of 48. Material 3 leaves 40 in height on desktop. Proposal: `minimumSize: Size(48, 48)` in the theme (see U5).

**U5. High, M. `AppTheme` discards `success` and `warning` and defines no component themes.**
`packages/ui/lib/src/theme/app_theme.dart:11-43` builds a `ColorScheme` with 11 roles; the `tokens` palette (`colors.dart`, class `ColorPalette`) has `successBase/On` and `warningBase/On` that never reach the theme. That is why `billing` hardcodes `Color(0xFF2E7D32)` and friends (see B1). The theme also has no `FilledButtonThemeData`, `InputDecorationTheme` or `minimumSize`, so every screen decides.
Proposal: `ThemeExtension<StatusColors>` (`success`, `onSuccess`, `warning`, `onWarning`, `info`) registered in `AppTheme._build`, read with `Theme.of(context).extension<StatusColors>()!`. Add `info` to `design-tokens.json` and `tokens`. Add the button and field themes with minimums of 48. Test contrast with `textContrastGuideline`.

**U6. Medium, M. `ui` knows the error domain.**
`error_view.dart:1-2` and `action_error.dart:1-2` import `contracts` and `i18n` (`ApiErrorException`, `ProblemDetails`), against "`ui` knows no domain". Proposal: `ErrorView` receives a neutral `ErrorDetails(message, code, traceId)`; the `fromException` factory and `actionErrorMessage` move to `i18n` or to a small errors package. Do it after U3.

**U7. Low, S. Loose design values.**
`error_view.dart:92`, `empty_state.dart:49` (`size: 48`), `app_button.dart:56` (`dimension: 16`). Proposal: `AppIconSize.xl` and `AppIconSize.sm` in `tokens`.

---

## packages/tokens

**T1. Medium, S. Roles and scales that are improvised today are missing.**
`colors.dart` has no `info`; there is no `AppIconSize` or `AppRadius.full`. Result: `BorderRadius.circular(999)` in `billing/.../status_chip.dart:20` and `usage_meter.dart:53`, and `BorderRadius.circular(12)` in `backoffice/.../sagas_screen.dart:106,108`, even though `AppRadius` exists.
Proposal: add `AppRadius.full`, `AppIconSize` and the `info` role, regenerating from `design-tokens.json`.

---

## packages/utils and i18n

**I1. Medium, S. `formatMoney` creates two `NumberFormat`s per call.**
`packages/utils/lib/src/money.dart:8-16`. In an invoice list it runs per row. Proposal: compute the decimals with a small ISO 4217 table and cache the format by (locale, currency) in a `MoneyFormatter` class with an injectable constructor. Follow the preference for building in house.

**I2. Medium, S. There is no shared `Clock`.**
`typedef Clock = DateTime Function()` lives in `packages/auth/lib/src/session_manager.dart:13`, while `shell_core` (`shell_access.dart:64`, `shell_runtime.dart:53`) and `shell_host` (`shell_host.dart:44`, `step_up_page.dart:26`) repeat `DateTime Function()` and `clock = DateTime.now`.
Proposal: move `Clock` to `utils` (a leaf of the graph, it already depends on `contracts`) together with `FakeClock` in `test_utils`, and have `auth`, `shell_core` and `shell_host` import it.

**I3. Medium, M. Sentence concatenation outside the ARB.**
More than 35 places build `'${l10n.etiqueta}: ${valor}'` or `'a · b · c'`: `backoffice/.../saga_detail_screen.dart:114-123,197,205`, `widgets.dart:179-186`, `dlq_screen.dart:195,224-230`, `tenants_screen.dart:122,150,186`, `sagas_screen.dart:51,123,133`, `account/.../sessions_screen.dart:119`, `devices_screen.dart:101`, `agreements_screen.dart:60,148-158`, `billing/.../billing_plan_screen.dart:142`, `invoice_detail_screen.dart:114`. The `front-i18n` skill forbids it because it breaks in other languages.
Proposal: ARB keys with placeholders (`"sagaType": "Tipo: {value}"`) or a `LabeledValue(label, value)` widget in `ui` for label and value pairs (and make it `MergeSemantics`, which is the allowed use). The `·` separators move to a `Text.rich` or to keys with placeholders.

**I4. Low, S. Duplicated `supportedLocales`.**
`packages/i18n/lib/i18n.dart:14` already exposes the list, but `billing/test/utils/test_app.dart:35` writes `const [Locale('es'), Locale('en')]`. Use the package's.

---

## packages/shell_core

**SC1. High, M. `DateTime.now()` in `AccessRule` and an optional clock.**
`packages/shell_core/lib/src/access_rule.dart:63,68,84`: `now ?? DateTime.now()` in `allows`, `decide` and `reachableBy`. It is the violation the script flags.
Proposal: make `now` mandatory (`required Clock`/`DateTime now`) and have the callers (`ShellAccessScope`, `context.can`, `buildShellRouter`) pass `clock()`. With the `Clock` from I2. Effort M because of the callers and the tests (`access_rule_test.dart`, `mfa_rule_test.dart`).

**SC2. High, M. Mutable global state and functions with dependencies instead of classes.**

- `deferred_page.dart:12-32`: global map `_libraryLoads` and `resetDeferredPageCache()` marked `@visibleForTesting`. It is state in a top-level variable, and it forces a duplicated `loadNow` in `tasks/test/support.dart:12` and `assistant/test/support.dart`. Proposal: `final class DeferredLibraryLoader` with a per-instance cache, which `ShellHost` creates and hands over through the constructor. `deferredPage` becomes a method. Tests create their own instance and need no reset.
- `shell_navigation.dart:10,23`: `homeLocation` and `signOutAndGoToLogin` receive registry, router and session as parameters. Proposal: `final class ShellNavigator(registry, router, session, paths)` with `home()` and `signOutAndGoToLogin()`.
- `shell_access.dart:40,191` (`redirectFor`, `accessRedirect`) and `shell_router.dart:50-198` (`buildShellRouter`, about 150 lines and 8 parameters): `final class ShellRouterFactory` with the collaborators in the constructor and small methods (`_validatePaths`, `_wrapRoutes`, `_redirect`).
- `shell_host/lib/src/screen_loader.dart:10`: `shellScreenLoader` becomes a method of that same class.

**SC3. Medium, S. No API to declare deferred screens without repetition.**
`mf_tasks.dart:39-79` repeats `loadLibrary: screens.loadLibrary, loading: _loading, builder: (scope, {params = const {}}) => ...` five times; `mf_account.dart`, `mf_backoffice.dart` the same. See M1 for the proposal.

**SC4. Low, S. `defaultLifecycleRetryDelay` and `Timer` in `shell_runtime.dart:17,244`.**
Correct (the delay is injected with `lifecycleRetryDelay`). Only document the parameter in the constructor.

---

## packages/shell_host

**SH1. High, L. `ShellHost` does too much.**
`packages/shell_host/lib/src/shell_host.dart:37-268` is registry, session, runtime, router, step-up, menu badges, sign-out, session restore and its own routes in a 230-line class, with three `late final`.
Proposal: extract `MenuBadges` (lines 111-125 and 195-207: subscriptions and count map), `SessionBinding` (209-224: follows the connection's access and signs out) and `ShellRoutes` (234-267). `ShellHost` remains as a composition with a constructor that receives those pieces, and the common case is assembled with a `ShellHost.assemble(...)` factory. Effort L because of the tests in `shell_host_test.dart` and in both apps.

**SH2. Medium, M. `MfaFlow` uses `bool busy` plus `errorCode` plus nullable fields.**
`packages/auth/lib/src/flows/mfa_flows.dart:20-21` (`_busy`, `_errorCode`, `_pending`, `_challenge`) allows impossible combinations (busy with an error). Proposal: `sealed class MfaState` (`MfaIdle`, `MfaBusy`, `MfaAwaitingMethod(pending)`, `MfaAwaitingCode(pending, challenge)`, `MfaFailed(code, previous)`), and widgets do an exhaustive `switch`. The comments in that file are in Spanish and those in `mfa_widgets.dart` in English; unify in English.

**SH3. Medium, S. Accessibility and input in the shell forms.**
`pages/mfa_widgets.dart:97-110` (`MfaErrorText`) is not a live region: a wrong code error is not announced. `sign_in_form.dart:68-84` and `mfa_widgets.dart:79-86`: the `TextField`s do not declare `textInputAction` or `keyboardType` for the code. Proposal: `Semantics(liveRegion: true)` on the error, `textInputAction: next` and `done`, `keyboardType: TextInputType.number` on the code.

**SH4. Low, S. `catch (error, stack)` in `shell_host.dart:164`.**
Intentional (it reports with `FlutterError.reportError`), but it contradicts the rule. Leave it with a comment explaining why or catch `Exception` and let `Error`s through.

---

## packages/auth and packages/api

**A1. Medium, S. Unfiltered `catch (error)` in `session_manager.dart:292`.**
Inside `_doRefresh`, it also catches `Error`. Proposal: `on Exception`. Check that the following `rethrow` is kept.

**A2. Low, S. Duplicated `Clock`.** See I2.

**A3. Low, S. `identity_connection.dart:251` decodes JSON with `is Map<String, dynamic>` and `decoded['code'] is String`.**
It is the allowed use of pattern matching; migrate to `if (decoded case {'code': String code})` if it is touched.

---

## packages/test_utils

**TU1. High, M. The package contributes almost nothing.**
`packages/test_utils/lib/test_utils.dart` exports only 3 auth fakes and `DeferredLibrariesLoader`. Only `auth`, `shell_host`, `verifier` and the two apps declare it. The other 6 microfrontends have their own harness: `account/test/utils/test_app.dart`, `billing/test/utils/test_app.dart`, `backoffice/test/utils/harness.dart`, `notifications/test/utils/test_app.dart`, `tasks/test/support.dart`, `assistant/test/support.dart`, `verifier/test/support.dart`. Three live in `test/support.dart`, outside the `test/utils/` convention.
Verified duplication:

- A `testApp`/`pumpApp` with `MaterialApp` + delegates + `ShellAccessScope` in 7 files.
- A test `ProblemDetails(...)` in 9 files (`unavailableProblem` is identical in `tasks/test/support.dart:111` and `assistant/test/support.dart:105`).
- 63 `UserSession(` literals in tests, with `billingSession`, `testSession`, etc., spread around.
- `loadNow` duplicated in `tasks` and `assistant`.
  Proposal: add to `test_utils` the classes `TestApp` (builds `MaterialApp` or `.router` with locale, extra delegates and session), `SessionBuilder` (`.withPermissions`, `.mfaVerifiedAt(clock)`), `ProblemFixtures` (`unavailable()`, `forbidden()`), `FakeClock` and `TestScope` (demo or live scope). Each microfrontend keeps only its own (its delegates and its seeds). `test_utils` depends on `auth` and `shell_core` today: confirm it does not create a cycle when used from `ui` (if it does, keep the `pumpApp` of `ui/test/utils/pump.dart` and have `test_utils` not depend on `ui`).

**TU2. High, M. The accessibility and layout utilities the skills ask for are missing.**
No `meetsGuideline` in the whole front, no 2x scale test, no golden, and `setSurface` exists only in `ui/test/utils/pump.dart:28` (also used in `backoffice/test/utils/harness.dart` and `mobile_shell_test.dart`).
Proposal: in `test_utils`, `expectAccessible(tester)` (runs `androidTapTargetGuideline`, `iOSTapTargetGuideline`, `labeledTapTargetGuideline`, `textContrastGuideline`), `pumpAtWidths(tester, widget, {320, 800, 1280})` and `pumpAtTextScale(tester, 2.0)`. Then add one test per microfrontend screen.

**TU3. Low, S. `test_utils` `pubspec.yaml`: `flutter: ">=1.17.0"`.** Align with the rest (`sdk: ^3.14.0`).

---

## microfrontends/account

**AC1. High, L. Five screens with the logic inside the `State`.**
`sessions_screen.dart:33-74`, `devices_screen.dart:33`, `security_screen.dart:34-96`, `account_overview_screen.dart:31`, `agreements_screen.dart:26-80`. Each one repeats `_load` / `_reload`, uses `widget.repository.*` directly, catches errors, orchestrates step-up and reloads. None discards stale responses: a quick `_reload()` after "sign out" can overwrite with old data (`sessions_screen.dart:42-51`).
Proposal: `SessionsController`, `DevicesController`, `SecurityController`, `AgreementsController`, `AccountOverviewController` (`final class ... extends ChangeNotifier`) with `AsyncLoader` (U2) and `ActionRunner` (U3). The screens remain as `ListenableBuilder` and buttons that call methods. For the mutable `closed` of `sessions_screen.dart:67-72` and `codes` of `security_screen.dart:75-81`, which are captured in closures today, the controller returns the value (`Future<int> closeOthers()`).

**AC2. High, M. Functions with `BuildContext` and dependencies.**
`widgets/account_widgets.dart:133` (`runAccountAction`), `widgets/step_up.dart:17,27` (`confirmStepUp`, `runSensitiveAction`) and `screen_builders.dart:29,39,49` are top-level functions with dependencies. Proposal: `final class StepUpGate(requestStepUp, canRule)` with `Future<bool> ensure()`, injected into the controller; `runAccountAction` disappears with U3.

**AC3. Medium, S. `DateTime.now()` in the fake.**
`data/fake_account_repository.dart:108,135,145,172,197,202,226`. Proposal: `FakeAccountRepository({Clock clock = ...})`, and a `FakeClock` in tests (`test/utils`). Seeds relative to that clock.

**AC4. Medium, S. Compact layout only.**
`sessions_screen.dart:81-87` passes only `compact:` to `PlatformScreen`: on wide web, the list stretches to the full width. Proposal: `Center` + `ConstrainedBox(maxWidth: 720)` in the body (like `backoffice/.../widgets.dart:64`) or a shared `AccountPage` in `ui`. Also `Alignment.centerRight` (line 106) should be `AlignmentDirectional.centerEnd`.

**AC5. Medium, S. `AccountAsyncView` (`account_widgets.dart:102-129`) duplicates backoffice's `AsyncBody` (`widgets.dart:121-147`).**
Both wrap `AsyncValueView` with a message. With U6 the error mapping stays in `ui` and both disappear.

**AC6. Low, S. Spanish comments in `lib/`** (`step_up.dart:7-12`, `sessions_screen.dart:15,25`, `account_widgets.dart` and others). The `front-analysis` skill asks for `///` in English. Unify when touching each file. The same in `notifications` (`inbox_screen.dart:25,53,102`, `fake_notifications_repository.dart`) and `auth/flows`.

**AC7. Low, S. Duplicated `localeTag`** in `account_widgets.dart:9` and `billing/.../billing_labels.dart:9`. Move it up to `utils` or to `ui` (`context.localeTag`).

---

## microfrontends/assistant

**AS1. High, S. Global variable with an access rule.**
`assistant_chat_screen.dart:152`: `final AccessRule toolAccess = AccessRule.permissions([...])` is top-level state outside `shared/constants`, against "no global instances". Proposal: move it to `shared/constants/assistant_access.dart` as `abstract final class AssistantAccess { static final tools = ...; }`, as `tasks_access.dart` and `account_access.dart` do.

**AS2. High, M. `AssistantChatController` mixes `loadState` with `_error` and `load()` does not discard stale responses.**
`assistant_chat_controller.dart:22-23` (`AsyncValue` + `Object? _error`) and `:39-49` (`load()` without `_requestId`: a double "retry" can overwrite). `send` does not prevent `load` from finishing later and overwriting `_messages` (line 47: `result.valueOrNull ?? _messages`). Proposal: `sealed class ChatState` (`ChatLoading`, `ChatReady(messages, answer)`, `ChatFailed(error)`) with `AnswerState` (`Idle`, `Streaming(id)`, `Failed(error)`), `_requestId` in `load()`. `isStreaming` (line 30, `_subscription != null`) comes from the state instead. No documented API: the public getters (29-36) have no `///`.

**AS3. Medium, S. Logic in the widget.**
`assistant_chat_screen.dart:143-147` (`_errorMessage` decides the text by quota code) and `:55-64` (`_onChanged` decides when to show the error). Proposal: the controller exposes `ChatFailureKind` (`quotaExceeded`, `generic`) and the widget only maps it to text; `_reportedError` and the "show once" logic move to the controller (`Object? takeError()`).

**AS4. Medium, S. `_scrollToEnd` jumps to the end on every notification** (`:66-72`), even if the user scrolled up to read. Proposal: only auto-scroll if the user was already at the end (`position.pixels >= maxScrollExtent - tolerance`).

**AS5. Medium, S. Chat accessibility.**
`:124-136`: the text field uses `hintText` without `labelText`; the `FilledButton` buttons are correct but the message coming from the assistant is not a live region. Proposal: `labelText: l10n.inputHint`, `Semantics(liveRegion: true)` on the bubble being generated (taking care not to announce every fragment: announce at the end with `SemanticsService.sendAnnouncement`). Magic spacing: `AppSpacing.sm + 4`, `md - 2`, `sm + 2` (lines 167-190, 280), `maxWidth: 640`. Proposal: `AppSpacing.bubble` tokens or a `ChatBubble` in its own file (today `_MessageBubble` takes about 200 lines in the same file as the screen; "one file, one class" rule).

**AS6. Medium, S. Tests with real waits.**
`test/assistant_scope_test.dart:44,48,61,67` uses `Future<void>.delayed(const Duration(milliseconds: 90))` and `300` with a real clock; it is fragile on slow CI. Proposal: `fake_async` already comes with `flutter_test` (`fakeAsync`), or have the fake expose a `Completer` per fragment.

---

## microfrontends/backoffice

**B0. High, L. Five screens with a `Future` in the `State` and actions inside the widget.**
`sagas_screen.dart:24-33`, `saga_detail_screen.dart:35-78`, `dlq_screen.dart:31-99`, `tenants_screen.dart`, `tenant_detail_screen.dart:29`, `overview_screen.dart:26`. They use a `late Future<T>` replaced inside `setState` plus `FutureBuilder` (`AsyncBody`), a style different from the rest's `AsyncValue`. `dlq_screen.dart:57-99` mixes confirmation, call, reload of two lists and snackbar in the `State`; `saga_detail_screen.dart:48-78` the same with the reason.
Proposal: `SagasController`, `SagaDetailController`, `DlqController`, `TenantsController` with `AsyncLoader` (U2) and `ActionRunner` (U3). Remove `AsyncBody` (`widgets.dart:121`) and use `AsyncValueView`. The dialogs stay in the widget (they are presentation), but `onConfirm` calls a controller method.

**B1. Medium, S. Sequential loading.**
`saga_detail_screen.dart:38-42`: `await saga(...)` and then `await sagaAudit(...)`; they are independent. Proposal: `Future.wait` or a `record` of futures in the controller.

**B2. Medium, S. `BackofficePage` wraps everything in `SingleChildScrollView`.**
`widgets.dart:60-86`. The lists (sagas, DLQ, tenants) are built whole and lose lazy loading; the skill says `ListView.builder` for unknown length. Proposal: `CustomScrollView` with `SliverList` or have each screen use `ListView.builder` with the header as the first item. The section navigation (`_SectionNav`, 92-117) uses `TextButton` without indicating the current section or selection semantics. Proposal: `NavigationBar` or `SegmentedButton` with `selected`.

**B3. Medium, S. Magic values and directionality.** `sagas_screen.dart:44` (`Alignment.centerLeft`), `:106,108` (`BorderRadius.circular(12)`), `widgets.dart:65` (`maxWidth: 1100`). Use `AlignmentDirectional.centerStart`, `AppRadius.md`, a constant in `shared/constants`.

**B4. Medium, S. Concatenation in the UI.** See I3 (the largest concentration: 20 places).

**B5. Low, S. `showBackofficeDialog` (`widgets.dart:31-38`) exists because dialogs go to the root navigator and lose localization.** It is a local solution to a problem all microfrontends have. Better a `DeferredLocalizations` in `shell_core` (see M1) and use `useRootNavigator: false`.

---

## microfrontends/billing

**BI1. High, S. Fixed colors that already exist in `tokens`.**
`screens/widgets/billing_colors.dart:7-19` defines `Color(0xFFB26A00)`, `0xFF2E7D32`, `0xFF1565C0`, `0xFF616161`, `0xFFC62828` and `status_chip.dart` and `usage_meter.dart:29-31` use them. It contradicts the layout skill ("never `Color(0xFF...)`") and does not change with dark mode, so contrast in dark mode is not verified. Proposal: use `StatusColors` from U5 and delete the file. For the chip, use `color: statusColors.successContainer` or compute the background with `Color.alphaBlend` in the theme instead of `color.withValues(alpha: 0.12)` (`status_chip.dart:18`). The status is shown with a label in addition to color, good.

**BI2. High, M. Four screens and a sheet with logic in `State`.**
`billing_plan_screen.dart:37`, `invoices_screen.dart:26`, `invoice_detail_screen.dart:34`, `change_plan_sheet.dart:32-70`. `change_plan_sheet.dart:35` combines `bool _saving` with `_selectedId` and `_plans` (three-piece state); `_confirm` orchestrates the call and the `pop`. Proposal: `ChangePlanController` (`ChangePlanState`: `Choosing(selectedId)`, `Saving(selectedId)`, `Failed(selectedId, error)`), `BillingPlanController`, `InvoicesController`.

**BI3. Medium, S. `usageLevelFor` is a top-level function inside `shared/types`** (`billing_types.dart:16`). It is pure and has no dependencies, so it is allowed, but it belongs on `Quota`/`QuotaUsage` as a method (`usage.level` already exists in `usage_meter.dart:23`). Move it to the `QuotaUsage` class.

**BI4. Medium, S. Duplicated `localeTag` (see AC7)** and a `SizedBox(height: 160, child: LoadingView())` (`change_plan_sheet.dart:89`) that fixes a height over content; use `ConstrainedBox(minHeight:)`. `EdgeInsets.fromLTRB` on line 79: `EdgeInsetsDirectional.only`.

---

## microfrontends/notifications

**N1. High, M. `_NotificationsInboxScreenState` is a disguised controller and has races.**
`inbox_screen.dart:23-121`: buffer of live arrivals, merge (`_merge`), optimistic update and rollback, all in the `State`.

- `_fetch` (42-51) does not discard stale responses: tapping "retry" twice mixes two `_merge`s.
- `_markOptimistically` (104-121) reverts to `previous`, which discards any notification that arrived live while saving (if a new one arrived and the save failed, it is lost from the list). Proposal: revert only the `read` field of the affected ids.
  Proposal: `InboxController` (`ChangeNotifier`) with `_requestId`, buffer, `markRead(id)`, `markAllRead()` and a sealed `InboxState`. The screen only paints.

**N2. Medium, S. `PreferencesScreen` saves without serializing.**
`preferences_screen.dart:36-49`: two taps in a row launch two `savePreferences`; if the first fails and reverts to `previous`, it erases the second change. Proposal: `PreferencesController` with a queue (one save at a time, the most recent `_pending` wins). Time selection uses `showTimePicker` in the widget, which is correct; the decision of `start` vs `end` (lines 70-82) goes to the controller (`setQuietStart`, `setQuietEnd`).

**N3. Medium, S. `fake_notifications_repository.dart` is the most complete fake pattern and is not reused.**
It has `latency`, `fetchError`, `markError`, `saveError`, `isDisposed`, `_delayed` and `_notifyChanged` (lines 11-75), reimplemented in other shapes in `FakeTasksRepository.failNext` (`fake_tasks_repository.dart:50`), `FakeAccountRepository._respond` (`:64`) and `FakeAssistantRepository`. See M2.

---

## microfrontends/tasks

**TK1. High, M. Form and detail with the logic in the widget; the list is fine.**
`TasksListController` (`tasks_list_controller.dart:15-135`) is the model to follow. On the other hand:

- `task_form_screen.dart:34-124`: `_saving`, `_fieldErrors`, `_loaded`, `_save`, `_load`, `_retry`, the decision to create or edit and where to navigate. Proposal: `TaskFormController` with a sealed `TaskFormState` (`Loading`, `Editing(fieldErrors)`, `Saving`, `Saved(taskId)`, `LoadFailed`). The screen only navigates when it sees `Saved`.
- `task_detail_view.dart:37-125`: `_requestId`, `_deleting`, subscription to changes, `_confirmDelete`. Proposal: `TaskDetailController` with the subscription and the discarding, like the list. `_deleting` (a bool that silences an event) is a sign that the state should be sealed (`Showing`, `Deleting`, `Deleted`).

**TK2. Medium, S. `DateTime.now()` and UUID generation inside the fake.**
`fake_tasks_repository.dart:148`. Proposal: inject `Clock` and move the generator to `class UuidV7Generator` in its own file (today it is 25 lines of arithmetic inside the repository) with its own tests. Move `delay` to `FakeBehavior` (M2).

**TK3. Medium, S. Layout with fixed values.**
`tasks_list_screen.dart:86` (`SizedBox(width: 360`), `:114,137` (`EdgeInsets.fromLTRB`). Use `AppLayout.listPaneWidth` and `EdgeInsetsDirectional`. On that screen, `_select` keeps `_selectedId` in the `State`: it is screen state, it goes to the controller.

**TK4. Medium, M. `mf_tasks.dart:39-79` and `builders.dart`.** See M1.

**TK5. Low, S. `test/support.dart` and `test/manifest_test.dart` + `test/tasks_screens_test.dart` (467 lines).** `support.dart` should go to `test/utils/`; split `tasks_screens_test.dart` per screen (`test/screens/tasks_list_screen_test.dart`, etc.) as the testing skill asks (mirror of `lib/src`).

---

## microfrontends/verifier

**V1. High, M. `_VerifierViewState` is a hand-written state machine.**
`verifier_screen.dart:61-215`: seven fields (`_pending`, `_code`, `_copied`, `_denying`, `_blocked`, `_secondsLeft`, `_generation`), a `Timer.periodic` (139), a subscription, and four places that do `_ticker?.cancel(); _generation++;` (100-161, 197-198). The `bool`s `_denying` and `_blocked` next to `_pending` allow impossible combinations, and `_copied` never goes back to `false` except with a new challenge.
Proposal: `VerifierController` with `sealed VerifierState` (`Waiting`, `Challenge(challenge, code, secondsLeft, copied)`, `Denying`, `Blocked`, `Failed(error)`), an injectable `Timer` (a `Ticker` with a `Duration` through the constructor, like `searchDelay` in the list) and encapsulated `_generation`. The one-second tick should be recomputed with `Clock` and `expiresAt`, not with a `_secondsLeft--` counter that drifts if the app goes to the background.

**V2. Medium, S. Accessibility of the countdown and the code.**
`verifier_widgets.dart` (193 lines): the countdown changes every second without `Semantics`; the grouped 6-digit code (`verifier_codes.dart:19`, `groupCode`) should be read digit by digit and not announced every second. Proposal: `Semantics(label: ..., value: ..., liveRegion: false)` and announce only on reaching 10 s and 0 with `SemanticsService.sendAnnouncement`. `disableAnimations` for the progress bar.

**V3. Low, S. `data/fake_verifier_repository.dart:19` and `demo_device_key.dart`** already implement the port with a class. Good. Only `verifier/test/support.dart` should move to `test/utils/`.

---

## apps/web and apps/mobile

**AP1. High, M. The two scaffolds duplicate and differ in how "selected" is computed.**
`apps/web/lib/src/pages/web_shell_scaffold.dart:27-62` and `apps/mobile/lib/src/shell/mobile_shell_scaffold.dart:33-98` build the same `ListenableBuilder` with destinations, badges and a sign-out action. They also diverge: web compares by `manifestForPath(...)?.id` (lines 33-36) and mobile by `location.startsWith(e.path)` (line 59), which gives a false positive with `/tasks2` and `/tasks`. The logic that splits into primary and "More" (lines 38-52 of mobile) is inside `build`.
Proposal: `final class ShellMenuModel(host, location, locale, maxPrimary)` in `shell_host` with `destinations`, `selectedIndex`, `overflow`, `onSelected` and unit tests; the scaffolds only paint. Remove `host.signOut()` without `await` in a lambda (`onPressed: () => host.signOut()`) by using an explicit `unawaited` or letting the model wrap it. Effort M.

**AP2. High, M. 1370 lines of nearly identical tests.**
`apps/web/test/web_shell_test.dart` (719) and `apps/mobile/test/mobile_shell_test.dart` (652) repeat the same scenarios (sign-in with `from`, sign-out, forbidden page, step-up, MFA, identity change) with different names. Proposal: a shared suite in `shell_host/test/` with a `defineShellScenarios(ShellFixture)` function and have each app test only its own (each platform's menu, mobile's "More", `deep_link_mapper`). Effort M to L.

**AP3. Medium, S. `config.dart` and `main.dart` identical except for the token store.**
`webIdentityConnection` and `mobileIdentityConnection` repeat the structure; the difference is 2 arguments. Having two apps is fine, but an `IdentityConnectionFactory` in `shell_host` with `fromBaseUrl(String, {required TokenStore, required HttpTransport})` removes the repeated `baseUrl.isEmpty` condition. Effort S.

**AP4. Low, S. `front/build/` exists empty at the root.** The structure skill forbids it at the root (output goes to each app's `build/`). Delete it and check that `.gitignore` covers it.

---

## tools

**TL1. Medium, M. The checks do not cover the `front-code` rules.**
`check_microfrontend_boundaries.dart` and `check_deferred_chunks.dart` check boundaries and deferred chunks, and the `check-structure.mjs` script (outside `front/`) only checks `DateTime.now()`. There is no automatic check for: `catch (e)` without `on`, `bool isLoading` plus `error` in controllers, `Color(0x...)` or `Colors.` in microfrontends' `lib/`, `setState` followed by `await` without `mounted`, `Text('...')` literals. Proposal: adding a custom analyzer rule is not cheap (plugin); it is more practical to extend `check-structure.mjs` with three cheap rules (`Color(0x` outside `tokens`, `catch (` without `on` in `lib`, `Text('` with a literal in `screens`) and enable the `front-analysis` lints (`unawaited_futures`, `avoid_dynamic_calls`, `public_member_api_docs` in shared packages).

**TL2. Low, S. The tools are scripts with top-level functions** (`check_microfrontend_boundaries.dart:54-257`, `check_deferred_chunks.dart:35-242`). For CLIs it is acceptable, but both repeat `_fatal` (255 and 240) and the lookup of the front root (`_allMicrofrontends`, `_findFrontRoot`). Extract `FrontRoot` and `CliExit` to a shared `tools/lib/`. Low priority.

**TL3. Low, S. `check_deferred_chunks.dart:133` defines `_ArbText` and `_Options` as classes, but the rest is procedural.** Just mentioning it: if it is touched, turn it into `DeferredChunkChecker`.

---

## Cross-cutting: ease of creating a new microfrontend

**M1. High, M. Today a new microfrontend requires copying and pasting ~6 blocks.**
To create one (for example `reports`) you have to write by hand:

1. `mf_reports.dart` with `ScreenRoute(... loadLibrary: screens.loadLibrary, loading: _loading, builder: (scope, {params = const {}}) => ...)` per screen (`mf_tasks.dart:39-79`: 40 lines for 4 routes).
2. `_localized(...)` with `Localizations.override`: copied in `account/screen_builders.dart:39`, `billing_screens.dart:45`, `tasks/builders.dart:22`, `backoffice/widgets.dart:16`, `assistant_screens.dart:47`, `notifications/screens.dart:40`, `verifier_screen.dart:44`.
3. `_repository(scope)` with `scope.get<T>((services) => switch (services.mode) {...})` (account, billing, notifications, tasks).
4. A routes class, an access class, a constants class and an enums class, each in its own file.
5. Test harness (see TU1).
6. A fake with latency, failures and `dispose` (see M2).
   Proposal, in `shell_core`:

- `ScreenRoute.deferred(path, library: screens.loadLibrary, build: (scope, params) => ...)` with the shell's default `loading`; it turns the 5 lines per route into 1.
- `DeferredLocalizations(delegates: [...], child: ...)` that replaces the seven `_localized`.
- `RepositoryBinding<T>(demo: (services) => ..., live: (services) => ...)` with `scope.repository(binding)`; it removes the repeated `switch` and the `scope.get` cast.
- A template (`nx generate` or a `front-new-microfrontend` skill) that creates the skeleton with the `data/`, `screens/`, `shared/` folders and its `test/utils/`.
  The result should be: an `mf_x.dart` of about 25 lines and a `screens.dart` with one function per route.

**M2. High, M. Fakes without a common piece for latency, failures and disposal.**
Six fakes reimplement `delay`/`latency`, programmable failure and `_disposed`: `fake_tasks_repository.dart:31-132`, `fake_notifications_repository.dart:7-75`, `fake_account_repository.dart:20-65`, `fake_backoffice_repository.dart:8-33`, `fake_assistant_repository.dart:17-103`, `fake_billing_repository.dart:12`. Each one with different names and semantics (`failNext`, `fetchError`, `markError`, `isDisposed`).
Proposal: `final class DemoBehavior({Duration delay, Clock clock})` in `shell_core` with `Future<T> respond<T>(T Function() compute)`, `failNext(Object error, {int count})`, `dispose()` and `isDisposed`. Each fake receives a `DemoBehavior` through its constructor (composition) instead of inheriting. It removes `DateTime.now()` from the fakes in one go (SC1/AC3/TK2).

**M3. Medium, S. Dependencies with `^` in pubspecs.** `go_router: ^18.1.4`, `intl: ^0.20.3`, `material_ui: ^1.11.0` in the 7 microfrontends and `shell_core`; the `front-structure` skill asks for exact versions. Pin them with a single source in `front/pubspec.yaml` (workspace) and have the microfrontends not repeat them if the workspace allows it.

---

## Plan by work packages

The file sets are disjoint. Packages 1 to 3 are the base and must land first, in this order. Packages 4 to 11 are independent of each other and can go in parallel once the base is ready. Test conflicts are avoided because each package owns the `test/` of its microfrontend.

**WP1. UI and state base.** (U1 to U7, T1, I3 partial, I4, TU2 partial)
Files: `packages/ui/**`, `packages/tokens/**` (plus `design-tokens.json`), `packages/i18n/**`.
Delivers: separate `AsyncValue` with a safe `guard`, `AsyncLoader<T>`, `ActionRunner`, `StatusColors`, button and field themes, component accessibility, `LabeledValue`, new ARB keys (`loading`, labels with placeholders).
Effort: L. First, because everything else uses it.

**WP2. Shell base.** (SC1 to SC4, SH1, SH3, SH4, I2, M1 shell part, M2, AP1 model)
Files: `packages/shell_core/**`, `packages/shell_host/**`, `packages/utils/**` (the `Clock`).
Delivers: shared `Clock`, `AccessRule` with mandatory `now`, `DeferredLibraryLoader`, `ShellNavigator`, `ShellRouterFactory`, `ScreenRoute.deferred`, `DeferredLocalizations`, `RepositoryBinding`, `DemoBehavior`, `ShellMenuModel`, split of `ShellHost`.
Effort: L. In parallel with WP1 except for `Clock` (WP2 creates it; WP1 does not use it).

**WP3. test_utils.** (TU1 to TU3, I4 in tests)
Files: `packages/test_utils/**` and `packages/ui/test/utils/**`.
Delivers: `TestApp`, `SessionBuilder`, `ProblemFixtures`, `FakeClock`, `TestScope`, `expectAccessible`, `pumpAtWidths`, `pumpAtTextScale`, test `DeferredLibraryLoader`.
Effort: M. Depends on WP1 and WP2 only for class names; it can be written against the agreed signatures.

**WP4. auth and api.** (A1 to A3, SH2)
Files: `packages/auth/**`, `packages/api/**`.
Delivers: filtered `catch`, sealed `MfaState` (the `shell_host` part that consumes it, `pages/mfa_widgets.dart`, `sign_in_form.dart`, `step_up_form.dart`, is done by WP2 when integrating it). To avoid overlap, WP4 exposes the state and WP2 adapts the widgets in the same delivery.
Effort: M.

**WP5. account.** (AC1 to AC7, I3 in its files)
Files: `microfrontends/account/**`.
Effort: L. Five controllers, `StepUpGate`, fake with a clock, tests per screen.

**WP6. backoffice.** (B0 to B5, I3 in its files)
Files: `microfrontends/backoffice/**`.
Effort: L. It is the one with the most concatenated text.

**WP7. billing and notifications.** (BI1 to BI4, N1 to N3)
Files: `microfrontends/billing/**`, `microfrontends/notifications/**`.
Effort: M to L. BI1 is quick (S) and high value; do it first.

**WP8. tasks and verifier.** (TK1 to TK5, V1 to V3)
Files: `microfrontends/tasks/**`, `microfrontends/verifier/**`.
Effort: M.

**WP9. assistant.** (AS1 to AS6)
Files: `microfrontends/assistant/**`.
Effort: M.

**WP10. apps.** (AP1 to AP4)
Files: `apps/web/**`, `apps/mobile/**`, `front/build/`.
Effort: M to L. Depends on `ShellMenuModel` (WP2). The shared scenario suite (AP2) needs a new file in `packages/shell_host/test/`, which belongs to WP2; coordinate so WP2 creates it and WP10 consumes it.

**WP11. tools, pubspecs and CI.** (TL1 to TL3, M3)
Files: `tools/**`, the root `pubspec.yaml`, `.claude/skills/front-structure/scripts/check-structure.mjs`.
Effort: M. At the end: the script's new rules would flag code that WP5 to WP9 have not migrated yet.

Recommended order: WP1, WP2 and WP3 in parallel (with the agreed signatures) and then WP4; then WP5 to WP10 in parallel; WP11 at the close. Inside each microfrontend, start with the highest-value S finding (BI1, AS1, AC3, TK2) as the first independent commit.
