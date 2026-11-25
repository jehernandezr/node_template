# mf_notifications

Notifications microfrontend: inbox, preferences per type and channel, and quiet hours. It meets the contract of [ADR 0018](../../../docs/adr/0018-microfrontend-contract.md).

## Routes

The manifest declares `ScreenRoute.deferred` for each screen. The routes are in `NotificationsPaths` (`lib/src/shared/constants`).

- `/notifications`: inbox with unread and read items, marked on tap, "Marcar todas como leídas" and live arrivals on top. If marking fails, only that notification goes back to unread, live arrivals are kept and `showActionResult` reports it.
- `/notifications/preferences` (child of `/notifications`): matrix of types by channels (in-app, push and email). Security alerts are fixed as on. Quiet hours with start and end. Changes are saved one at a time and in order. If a save fails and there is no newer change, the preference goes back to the last saved one; if there is a newer one, its save already carries that change and it is not reverted.

Both routes require a signed-in session (manifest rule); there are no notifications-specific permissions. Each screen draws its single bar with `AppPage` and shows loading, error and data with `AsyncValueView`.

## Structure

- `lib/src/screens/`: one screen (`StatelessWidget`) per route, on top of its controller (`InboxController`, `PreferencesController`). Controllers are `ChangeNotifier` and receive the repository through the constructor.
- `lib/src/screens/screens.dart`: `NotificationsScreens` builds each screen for a `MicrofrontendScope` and wraps it in `DeferredLocalizations`.
- `test/` mirrors `lib/src/`: `screens/`, `data/`, `lifecycle/`, `l10n/` and `shared/`. Test utilities are in `test/utils/`.

## Deferred loading

`lib/mf_notifications.dart` ships in the initial bundle. Neither it nor the lifecycle imports `src/data`, `src/screens` or `src/l10n` without `deferred as`:

- Screens are loaded with `screens.loadLibrary` from each `ScreenRoute.deferred`.
- `NotificationsLifecycle.initialize` loads `src/data/notifications_data.dart` with `deferred as` and gets the repository from the scope.

`front/tools/check_microfrontend_boundaries.dart` (in `analyze`) walks the manifest's import graph. In CI, `tools/check_deferred_chunks.dart` checks it against the real `main.dart.js.map`.

## Data

- `NotificationsData.repository` (a `RepositoryBinding`, in `lib/src/data/notifications_data.dart`) is the only access to the repository. It is obtained with `scope.repository(NotificationsData.repository)`; this way the lifecycle and the screens receive the same instance for the identity.
- `NotificationsRepository` (interface) is a `ScopedResource`. When the identity changes, the scope closes and calls `dispose()`, which ends `live()` and `watchUnreadCount()`.
- `FakeNotificationsRepository` implements it in memory. It receives a `DemoBehavior` for latency and failures programmed per operation; `push(...)` simulates a live notification (in production, SSE or Socket.IO).
- There is no notifications contract in `package:contracts` yet, so only demo mode exists.
- Shared types and enums in `lib/src/shared/{enums,constants,types}`.

## Events

- `UnreadCountChanged` is an event of this microfrontend (`lib/src/lifecycle/unread_count_changed.dart`, exported by `mf_notifications.dart`). The runtime creates a `NotificationsLifecycle` per activation (`lifecycleFactory`); it listens to `watchUnreadCount()` and publishes with `ShellContext.emit`, which discards whatever arrives after the identity changes.
- The menu entry declares it as a badge (`MenuBadge<UnreadCountChanged>`), so the shell draws the number without knowing this microfrontend.

## Texts

- `l10n.yaml` and ARB files in `lib/src/l10n/` (template `app_es.arb`, and `app_en.arb`). It generates `NotificationsLocalizations` in `lib/src/l10n/generated/`, committed.
- `NotificationsScreens` wraps each screen in `DeferredLocalizations` inside the deferred chunk, so its texts are not in the main bundle.

## Development

```sh
flutter gen-l10n
flutter analyze
flutter test
```
