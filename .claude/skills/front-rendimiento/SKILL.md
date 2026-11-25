---
name: front-rendimiento
description: 'Flutter UI performance: const, rebuilds, lists, deferred chunks and images. Use it in screens and widgets.'
paths:
  - 'front/**/screens/**'
  - 'front/**/widgets/**'
---

# Front performance

These rules are cheap and always apply.

## In the code

- **`const`:** every widget constructor, `EdgeInsets`, `SizedBox` and `Icon` that can be `const` is. The `prefer_const_constructors` lint requires it.
- **Widgets as classes, not methods:** a `Widget _buildHeader()` is rebuilt with its parent on every `build`. A `StatelessWidget` class with a `const` constructor skips the rebuild if its parameters do not change.
- **Scoped rebuilds:** the `ListenableBuilder` wraps the part that changes, not the whole screen. A controller that notifies often (typing, progress) is listened to in the smallest possible widget. The `child` argument of `ListenableBuilder` and `AnimatedBuilder` passes what does not depend on the state.
- **Minimal `setState`:** in the lowest `State` that needs it. State shared by several parts goes to the controller.
- **Pure `build`:** no controllers, futures, streams or formatters (`DateFormat`) created inside `build`. They are created in `initState` or in the controller.
- **Lists:** `ListView.builder` or `.separated`, with `itemExtent` or `prototypeItem` when the rows have the same size. `shrinkWrap: true` on a long list defeats lazy building: avoid it. A stable `Key` (`ValueKey(task.id)`) on rows that are reordered or deleted.
- **Pagination:** server lists with a cursor (`TasksListController.loadMore`), never load everything.
- **Images:** with `cacheWidth` or `cacheHeight` when shown smaller than the original, and with `errorBuilder`. An `Image.network` without a size causes layout jumps.
- **Opacity and clipping:** `Opacity`, `ClipRRect` and `saveLayer` are expensive inside lists and animations; prefer a color with alpha and `DecoratedBox`.
- **Animations:** `AnimatedBuilder` or scoped implicit animations, with a `RepaintBoundary` around what animates nonstop. An infinite indicator does not sit over the whole screen.
- **Heavy work:** large JSON parsing or long computation in `Isolate.run`, with a function that captures no widget or `BuildContext`.
- **Text input:** search-as-you-type uses an injected debounce (`TasksListController.search`) and discards stale responses.

## Deferred loading

- A microfrontend's screens, data and texts go in a deferred chunk (`deferred as`). The manifest only imports constants, enums and the lifecycle, and `check_deferred_chunks` enforces it on the web build.
- A heavy dependency that only one microfrontend uses (charts, editor) is imported from its chunk, not from a shared package everyone loads.
- Loading a chunk shows a state and a retry if it fails. `ScreenRoute.deferred` does this with `DeferredLibraryLoader.page` from `shell_core`, which accepts its own `loading` and `errorBuilder`. Each library is loaded once per loader instance, and a failure is forgotten so it can be retried.

## How to measure

- Suspect before optimizing: Flutter DevTools (performance, "Track widget rebuilds") in `--profile` mode, not in debug.

## With pstack

Method in `pstack-en-node-template`. The pstack skills that apply here: `benchmark-checklist`, `principle-explain-the-number`, `perf-issue`, `poteto-mode`, `trace-forensics`.
