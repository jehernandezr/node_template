# 0027. Screen patterns and shared front tests

- Status: Accepted
- Date: 2026-11-14
- Related: [ADR 0012](0012-front-flutter-shells-microfrontends.md), [ADR 0015](0015-repository-structure-and-shared-code.md), [ADR 0018](0018-microfrontend-contract.md)

## Context

The front had `Clock` in `auth` and five copies of `DateTime Function()`, 24 `State` classes in microfrontends with 51 calls to `widget.repository.`, the loading and action state repeated in every screen, seven `_localized` helpers, six fakes with their own latency and seven nearly identical test harnesses. Each screen solved loading, errors, actions and the clock on its own, so a fix in one place did not reach the others. The patterns had to be set before migrating the screens, so that new code is born with them and the script rules protect it from day one.

Every screen written without these patterns adds one more copy that would later have to be migrated, which is why the decision is made before the number of screens grows.

## Decision

- `Clock` (typedef `DateTime Function()`) and `systemClock` in `utils`, the only place with `DateTime.now()`; `AccessRule` receives a mandatory `now` and stops reading the clock.
- `AsyncValue` in `ui` with a `guard` that catches only `Exception`; `AsyncLoader` and `ActionRunner`; `ActionResult` with three outcomes (`ActionSucceeded`, `ActionFailed`, `ActionSkipped`) and `ActionConcurrency`; `ControllerBuilder` in `ui` creates and closes the controller.
- One `XController extends ChangeNotifier` per screen with sealed states, like `SessionsController`, and `StatelessWidget` screens that receive it with `ControllerBuilder`.
- `StatusColors` as a `ThemeExtension` in `ui` and the `info` token in `tokens`.
- `ErrorDetails` and `ErrorPresenter` live in `i18n`, which now depends on `contracts` to map each error code to text; `ui` only shows an `ErrorDetails` and stops depending on `contracts`.
- `DeferredLibraryLoader` with a per-instance cache, which replaces the global map of loaded libraries.
- `ScreenRoute.deferred` declares a deferred screen in three lines instead of six.
- `DeferredLocalizations` and `showLocalizedDialog` so that dialogs reapply their screen's localization delegates.
- `RepositoryBinding` declares, per microfrontend, how its repository is created in demo mode and in real mode.
- `DemoBehavior` concentrates the latency, the programmable failures and the closing of the fakes.
- `StepUpGate` lives in `account`, which is the only microfrontend that requests step-up.
- `ShellNavigator` and `ShellRouterFactory` in `shell_core` replace the loose navigation and router-building functions.
- `ShellHost` is split into `MenuBadges`, `SessionBinding`, `ShellRoutes`, `ShellDestination`, `ShellMenuModel` and `IdentityConnectionFactory`, and keeps its current constructor as a factory.
- A sealed `MfaState` in `auth` (`MfaStep`, `MfaBusy`, `MfaFailed`) replaces the loose flags of `MfaFlow`.
- `test_utils` adds `TestApp`, `FakeClock`, `SessionBuilder`, `ProblemFixtures`, `TestScope`, `DeferredLibrariesPreloader` and the helpers `expectAccessible`, `pumpAtWidths` and `pumpAtTextScale`.
- The shared suite of shell scenarios lives in `packages/test_utils/lib/src/shell/scenarios/` with `ShellFixture`, `ShellScenarioSetup` and `ShellUnderTest`; each app implements its fixture.
- The front's `check-structure.mjs` adds rules on colors, `catch` without `on` (except the `// catch-all:` marker), `Text('` and `widget.repository.` in screens, directionality, `l10n` interpolation, `DateTime.now()` and versions with `^`, with a baseline in `front/tools/structure-baseline.json`.
- Exact versions: each `pubspec.yaml` pins the exact number and the script watches it, because pub has no single version catalog.
- Minimum size: a height of 48 on every button and field in the theme.
- Migration order: additive changes first; legacy code does not get `@Deprecated`, it gets a `/// Legacy` comment and is removed in its own phase at the end.
- `front/tools/new_microfrontend.dart` creates a new microfrontend. Its templates live in `front/tools/new_microfrontend/templates/` as `.tmpl` files, which the formatter and the analyzer do not read. The generator is a pub workspace package with its own tests; it formats the package it creates and does not edit the apps, it only prints the two pieces each app needs. The `front-new-microfrontend` skill describes its use.

## Consequences

### Positive

- Screens do not hold their own state, and controllers are tested without widgets.
- There is a single clock source, and the shell tests are shared between the two apps.
- The new script rules protect new code from day one.
- A change in shared behavior, like the fakes' latency or the loading states, is made in one place and both apps see it.

### Costs

- The old and new APIs coexist until the removal, and `i18n` now depends on `contracts`.
- Buttons 48 high also appear on desktop.
- The `check-structure.mjs` baseline has to be emptied and deleted at the end.
- The `.tmpl` templates do not go through the formatter or the analyzer: their quality is covered by the generator package's tests and by a test microfrontend that is generated, validated and deleted on every template change.
- Each controller is one more class per screen, in exchange for tests that do not need widgets.
- Hardening `analysis_options.yaml` is outside this decision, as a separate change.

## Alternatives considered

- `useRootNavigator: false` for the dialogs: a dialog is a sibling route of the page and does not inherit the `Localizations.override`, so it does not solve the problem.
- A single version catalog in the pub workspace: pub does not offer one.
- Accepting `^` in the `front-structure` skill: discarded in order to pin exact versions.
- A separate `errors` package: it is cleaner, but it adds one more member to the workspace.
- A minimal `State` per screen instead of `ControllerBuilder`: it forces repeating `initState` and `dispose` on every screen.
- Two action outcomes instead of three: they do not distinguish "did not run" from "failed".
- The scenario suite in `shell_host/test`: a package cannot import another package's `test/`.
- `StepUpGate` in `shell_core`: only `account` uses it today; if another microfrontend needs it, it moves up without changing its signature.
- Script rules at the end instead of with a baseline: nothing would protect the code written in the meantime.
- Templates as strings in Dart code: the generation code becomes unreadable and the templates cannot be read or reviewed as files.
- A loose script, without a package or tests: nothing protects it when the microfrontend contract changes.
