# shell_core

Contracts and composition shared by the web and mobile Flutter shells.

- `MicrofrontendManifest`: eager description of a microfrontend (id, platforms, access, flag, menu, routes). Not deferred.
- `ScreenLoader` / `deferredPage`: wraps screens so their library loads on demand. Only screens are deferred. A failed load shows an error view with a retry.
- `resetDeferredPageCache()` (`@visibleForTesting`): forgets the cached library loads. Microfrontend tests that pump deferred screens must call it in `setUp`, because a cached load belongs to the fake-async zone of the test that created it and never completes in later tests:

  ```dart
  setUp(resetDeferredPageCache);
  ```

- `MicrofrontendRegistry`: holds manifests; answers visibility, menu and routes per platform.
- `ShellRuntime`: follows the session. For each identity (userId + tenantId) it builds `ShellServices`, owns one `MicrofrontendScope` per microfrontend, clears replayable events and disposes lifecycles. Tears all of it down when the identity changes.
- `MicrofrontendScope`: per-identity container of a microfrontend's objects. One instance per type.
- `ShellServices` / `DefaultShellServices`: session, sign-out, step-up (`requestStepUp`) and shell extras for one identity. There is no event bus here: lifecycles emit with `ShellContext.emit` and screens with `MicrofrontendScope.emit`, which drop events once the identity rotates.
- `buildShellRouter`: one `GoRouter` for all manifests, guarded by the first path segment.
- `ShellEventBus` / `ShellContext` / `UnreadCountChanged`: typed events between microfrontends, which never import each other.
- Navigation helpers: `MicrofrontendIdPath.fromPath`, `homeLocation`, `signOutAndGoToLogin`.
- `AccessRule`, `UserSession` and the access enums (from `contracts`) mirror the backend.

## How to write a microfrontend

Each microfrontend package exports a manifest. Screens live in a library that is imported as deferred.
The manifest's `routes` receives the shell's `load` (to defer screens) and a `scope` accessor (to reach objects of the current identity).

```dart
// lib/tasks.dart
import 'package:shell_core/shell_core.dart';
import 'package:go_router/go_router.dart';

import 'src/screens/tasks_screen.dart' deferred as screens;
import 'src/tasks_repository.dart';

final tasksManifest = MicrofrontendManifest(
  id: MicrofrontendId.tasks,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.permissions([Permission.tasksRead]),
  menu: [MenuEntry(labelKey: 'menu.tasks', path: '/tasks', order: 2)],
  routes: _routes,
);

List<RouteBase> _routes(ScreenLoader load, MicrofrontendScope Function() scope) => [
  GoRoute(
    path: '/tasks',
    builder: (context, state) => load(
      loadLibrary: screens.loadLibrary,
      builder: () => screens.TasksScreen(repository: scope().get<TasksRepository>(_createRepository)),
      loading: const Center(child: CircularProgressIndicator()),
    ),
  ),
];

// Created once per identity. Its dispose runs when the user or tenant changes.
TasksRepository _createRepository(ShellServices services) =>
    TasksRepository(session: services.session);
```

Rules:

- Route paths must start with `/${id.pathSegment}`. `buildShellRouter` throws `StateError` at startup otherwise.
- Get per-user objects through `scope().get<T>(create, dispose: ...)`, not from globals or top-level variables. The scope is looked up when the screen builds, so the object always belongs to the current identity. Pass `dispose` for anything that holds resources.
- `scope()` must be called inside a builder, not at route-building time, because the runtime only has a scope once the shell is running.
- Use `lifecycle` (a `Microfrontend` subclass) for setup that depends on the user, such as subscriptions. Subscribe with `context.listen<T>(...)`; the runtime cancels them.
- Microfrontends never import each other. Share events through `ShellEventBus`.

## Shell wiring

The shell builds `ShellServices` for each identity and hands the runtime to the router. The session is the shell's own `ValueNotifier`.

```dart
final registry = MicrofrontendRegistry()
  ..register(accountManifest)
  ..register(tasksManifest);

final session = ValueNotifier(UserSession.anonymous());

// The factory runs once per identity.
final runtime = ShellRuntime(
  registry: registry,
  platform: AppPlatform.web,
  session: session,
  servicesFactory: (identity) => DefaultShellServices(
    session: identity,
    onSignOut: () => authClient.signOut(),
    // Opens the shell's /step-up page and completes with the answer.
    onStepUp: () async => await router.push<bool>('/step-up') ?? false,
    extras: {AuthClient: authClient},
  ),
);
await runtime.start();

final router = buildShellRouter(
  registry: registry,
  platform: AppPlatform.web,
  runtime: runtime,
  routes: [
    GoRoute(path: '/', redirect: (_, _) => homeLocation(registry, session.value, AppPlatform.web)),
    GoRoute(path: '/login', builder: (context, state) => const LoginPage()),
    GoRoute(path: '/forbidden', builder: (context, state) => const ForbiddenPage()),
  ],
  // Optional: one ShellRoute around all microfrontend routes.
  shellBuilder: (context, state, child) => AppChrome(child: child),
);
```

Choose one way to place the microfrontend routes:

- default: appended at the top level;
- `shellBuilder`: wrapped in one `ShellRoute` (with `shellNavigatorKey` if needed). Shell pages (`/login`, `/forbidden`) stay outside it;
- `wrapRoutes`: receives the microfrontend routes and returns the route to add, for full control of the tree. Do not pass it together with `shellBuilder`.

Sign-out from the shell:

```dart
await signOutAndGoToLogin(router: router, session: session); // resets to anonymous, goes to /login without `from`
```

Helpers:

- `MicrofrontendIdPath.fromPath('/tasks/1')` returns `MicrofrontendId.tasks`, or null for unknown segments.
- `homeLocation(registry, session, platform)` returns the first visible menu path, or null.

Visibility hides navigation only. The real permission check lives in the API.
