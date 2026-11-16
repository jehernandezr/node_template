# shell_core

Contracts and composition shared by the web and mobile Flutter shells. It knows no microfrontend: each manifest brings its own id, menu, events and links. The contract is ADR 0018.

- `MicrofrontendManifest`: eager description of a microfrontend: `id` (`MicrofrontendId('tasks')`, also its first URL segment), platforms, access rule, flag, `modes` it can serve (`ShellMode.demo`, `ShellMode.live`), menu, screens, lifecycle and `deepLinks`. Only screens are deferred.
- `MenuEntry`: `MenuLabel` (one text per supported language), path, order, icon and an optional `MenuBadge<E>`, the count of the latest event `E`.
- `MicrofrontendRegistry`: holds the manifests, rejects repeated ids, ids that are not URL segments and labels without every supported language; answers visibility, menu, the owner of a location and app links.
- `ShellRuntime`: follows the session. For each identity (userId + tenantId) it builds `ShellServices`, owns one `MicrofrontendScope` per microfrontend, clears replayable events and disposes lifecycles. Tears all of it down when the identity changes.
- `ShellServices`: session, `mode`, `api` (the `ApiClient` with the session; a `StateError` in demo mode), sign-out and step-up for one identity. There is no event bus here: lifecycles emit with `ShellContext.emit` and screens with `MicrofrontendScope.emit`, which drop events once the identity rotates.
- `MicrofrontendScope`: per-identity container of a microfrontend's objects. One instance per type.
- `buildShellRouter`: one `GoRouter` for all manifests, inside one `ShellRoute` drawn by the shell, guarded by the first path segment.
- `ScreenLoader` / `deferredPage`: screens load on demand; a failed load shows an error view with a retry. `resetDeferredPageCache()` (`@visibleForTesting`) forgets cached loads; call it in `setUp` of widget tests.
- `AccessRule`, `AccessGate`, `context.can`, `accessRedirect`, `StepUpRequests`, `UserSession` and the access enums (from `contracts`) mirror the backend.

The `test_utils` package has `DeferredLibrariesLoader` for `setUpAll` of tests that open screens of several microfrontends.

## How to write a microfrontend

```dart
// lib/mf_tasks.dart: eager. Screens, data and texts are deferred.
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'src/screens/screens.dart' deferred as screens;
import 'src/shared/constants/tasks_paths.dart';

final tasksManifest = MicrofrontendManifest(
  id: tasksId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: AccessRule.permissions([Permission.tasksRead]),
  modes: const {ShellMode.demo},
  menu: const [
    MenuEntry(
      label: tasksMenuLabel,
      path: TasksPaths.list,
      order: 20,
      icon: Icons.check_circle_outline,
    ),
  ],
  screens: [
    ScreenRoute(
      path: TasksPaths.list,
      loadLibrary: screens.loadLibrary,
      builder: (scope, {params = const {}}) =>
          screens.buildTasksListScreen(scope),
    ),
  ],
);
```

Rules:

- Route paths start with `/${id.pathSegment}`. `buildShellRouter` throws `StateError` at startup otherwise.
- The manifest only reaches `src/shared/constants`, `src/shared/enums` and `src/lifecycle` without `deferred`. `front/tools/check_microfrontend_boundaries.dart` checks it in `analyze`, and `check_deferred_chunks.dart` on the web build.
- Get per-user objects through `scope.get<T>(create)`, never from globals. Pick the implementation with `services.mode`.
- Use `lifecycleFactory` for setup that depends on the user, such as subscriptions, and publish with `context.emit`.
- Microfrontends never import each other. An event other microfrontends listen to goes in a shared package.

Visibility hides navigation only. The real permission check lives in the API.
