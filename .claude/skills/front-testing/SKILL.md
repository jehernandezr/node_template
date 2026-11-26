---
name: front-testing
description: 'Front tests: test/ mirroring lib/src, controllers without widgets, test doubles as classes, TestApp and accessibility. Use it when writing or reviewing front tests.'
paths:
  - 'front/**/test/**'
  - 'front/packages/test_utils/**'
---

# Front tests

## Location

- Tests go in each package's `test/`, with the same subfolders as `lib/src`. Example: `lib/src/screens/tasks_list_controller.dart` is tested in `test/screens/tasks_list_controller_test.dart`. <!-- id: front-testing.1 -->
- They do not go inside `lib/`: Dart would publish the test code with the package, and `flutter_test` is a dev dependency that `lib/` cannot import. <!-- id: front-testing.2 -->
- Doubles and utilities used by several packages live in `front/packages/test_utils` (`package:test_utils/test_utils.dart`), declared only in `dev_dependencies`. What a single microfrontend uses goes in its `test/utils/`, like `TasksTestApp` in `test/utils/tasks_app.dart`. Never `testing/` folders or `support.dart`. <!-- id: front-testing.3 -->
- They follow the same rules as the code: classes, one file per class and no duplication. <!-- id: front-testing.4 -->

## What to test and where

- Controller, flow, repository: `test()` without widgets, with doubles. The logic lives here. <!-- id: front-testing.5 -->
- Widget or screen: `testWidgets`: what is shown and the events that go out. <!-- id: front-testing.6 -->
- Screen states: Loading, data, empty and error. All four. <!-- id: front-testing.7 -->
- Layout: One compact and one expanded width with `pumpAtWidths`. <!-- id: front-testing.8 -->
- Accessibility: `expectAccessible` and 2x scale with `pumpAtTextScale` (see `front-accessibility`). <!-- id: front-testing.9 -->
- `ui` components: Optional: golden tag `golden`. <!-- id: front-testing.10 -->

Every new business rule comes with its controller test. Every fixed bug comes with the test that would have caught it.

## How they are written

- Names that describe the behavior: `'an older answer never replaces a newer one'`, not `'works'`. `group` with the type under test (`group(TasksListController, ...)`) so a rename propagates. <!-- id: front-testing.11 -->
- Logic is tested in controllers and flows, without mounting widgets. <!-- id: front-testing.12 -->
- Widget tests check what is shown and the events that go out, not the logic. Find by localized text, by type or by `Semantics`; a `Key` only when there is no other stable way. <!-- id: front-testing.13 -->
- Doubles are classes that implement the port (`FakeAuthRepository`, `FakeTokenStore`, `FakeTasksRepository`), not generic mocks, and no `mockito` or `mocktail`. A double can have a gate (one `Completer` per call, like `ScriptedTasksRepository`) to control the order of the responses. <!-- id: front-testing.14 -->
- A test failure is `FakeFailure` from `test_utils` (`const FakeFailure()`), which is an `Exception`. Never a `StateError` or an `Error`: `AsyncValue.guard` and `ActionRunner` let an `Error` through and the test would not see the error state. <!-- id: front-testing.15 -->
- A demo double is created with `DemoBehavior()` without delay. Failures are scheduled with `failNext`. <!-- id: front-testing.16 -->
- Mutable state in `setUp` with `late`, without top-level variables shared between tests. Anything that must be released is registered with `addTearDown`. <!-- id: front-testing.17 -->
- Times come from a `FakeClock` from `test_utils` (`clock: fake.now`) or from constants of the code under test (`TasksListController.searchDebounce`), not from magic numbers. <!-- id: front-testing.18 -->
- Suites that mount routes with deferred libraries call `const DeferredLibrariesPreloader().load(manifests)` in `setUpAll`. Its `///` explains why it goes there and not inside `testWidgets`. <!-- id: front-testing.19 -->
- Layout errors (such as overflow) are not filtered out to make a test pass: fix the widget. <!-- id: front-testing.20 -->

## Waiting without fixed delays

- Async logic without widgets: `await pumpEventQueue()` or `await` the controller's future. <!-- id: front-testing.21 -->
- Widgets: `pumpAndSettle()` when everything finishes on its own. With an infinite animation (a `CircularProgressIndicator` on screen) `pumpAndSettle` never finishes: use `pump()` and wait for the condition. <!-- id: front-testing.22 -->
- A `Timer` with a known delay is advanced with `tester.pump(durationFromCode)`, using the constant of the code under test. Never `Future.delayed` or `sleep` in a test. <!-- id: front-testing.23 -->

## Widget, accessibility, layout and golden tests

Full templates in [references/widget-tests.md](references/widget-tests.md): `TestApp` per package, the four states, compact and expanded width, accessibility guidelines, text scale and golden tests.

## CI checks

- `analyze`, `test` and `format-check` for each front project. <!-- id: front-testing.24 -->
- `check_microfrontend_boundaries` for import boundaries and `check_deferred_chunks` on the web build for deferred loading. <!-- id: front-testing.25 -->
- `contracts_gen --check` when the contracts change. <!-- id: front-testing.26 -->

## With pstack

Method in `pstack-in-node-template`. The pstack skills that apply here: `principle-test-behavior-not-implementation`, `tdd`. The fake transports in `test_utils` apply the backend rules (headers, cookies, errors), so a green test means something.
