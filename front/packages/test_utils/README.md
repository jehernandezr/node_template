# test_utils

Test doubles and utilities shared by several front packages. It is only declared in `dev_dependencies`: production code never imports it.

- `FakeAuthRepository`, `FakeTokenStore` and `FakeDeviceKeyPort`: implement the `auth` ports.
- `FakeClock`: a clock that only advances when the test asks.
- `FakeFailure`: exception a fake throws to simulate a failed call. It replaces `StateError` in that role, because a `StateError` is a programming error and escapes `on Exception` handlers.
- `TestApp`: mounts `MaterialApp` or `MaterialApp.router` with the shared delegates, the session and the theme; `wrap` and `wrapRouter` return the widget, and `pump` mounts it and leaves a settled frame.
- `SessionBuilder`: builds `UserSession` step by step, instead of repeated literals. With `tenantId: null` it builds a platform operator.
- `ProblemFixtures`: problem responses (503, 403, 404 and a free code) shared by the failure tests.
- `TestScope`: a demo `MicrofrontendScope` with the repositories already registered with `withRepository`.
- `expectAccessible`: runs the four touch target size and contrast guidelines on what is on screen.
- `pumpAtWidths`: mounts a screen at each width and calls a check with each one.
- `pumpAtTextScale`: mounts a screen with the accessibility text scale (2x by default).
- `DeferredLibrariesPreloader`: loads in `setUpAll` the deferred libraries of the manifests, their screens and their lifecycle.
- `ShellFixture` and `ShellUnderTest`: what the scenario suite asks of each app to mount and observe it.
- `ShellScenarioSetup`: manifests, clock, initial session, real connection and initial route of a scenario.
- `defineShellScenarios`: registers in a group the shared session, additional step and shell identity scenarios.
- `ScenarioProbe` and `ScenarioIdentity`: probe microfrontend and real connection on top of `FakeAuthRepository`, for the scenarios.
- `RuntimeSettler`: waits in a widget test for the shell runtime to finish its queue, alternating the fake clock and the real event loop.
- `RoutePaths`: all the routes of a `go_router` tree and the ones that appear repeated.

What only one package's tests use goes in that package's `test/utils/`.
