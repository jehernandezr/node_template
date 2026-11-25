# 0018. Microfrontend contract

- Status: Accepted
- Date: 2026-11-12
- Updated: 2026-11-13 (shell services, step-up and real session)
- Updated: 2026-11-14 (demo or live mode, identity and menu declared by the manifest)
- Updated: 2026-11-15 (screen patterns and generator)

## Context

The November 12 review found leaks between identities in the front: mounted screens that keep the previous user's data, a lifecycle that keeps emitting the badge after sign-out, repositories that are never closed and one user's SnackBars visible to the next. Guards on subroutes, recent MFA for the backoffice and a layout rule were also missing: the shell and the screen drew two top bars in compact. Seven microfrontends are going to migrate in parallel, so the contract has to exist first in `shell_core` and `ui`.

## Decision

Every microfrontend complies with this contract. The previous APIs (`routes:`, `lifecycle:`, `ShellContext.eventBus` and `AdaptiveScaffold.compactActions`) have already been removed: the seven microfrontends migrated and `screens` and `lifecycleFactory` are the only way to declare them.

- **Screens:** the manifest declares `screens: [ScreenRoute.deferred(path, library: ..., build: (scope, params) => ..., routes: [...])]`. `library` is the deferred import of the screens bridge and `build` receives the `MicrofrontendScope` and `params`, which merges query and path (path wins). `params.require(name)` reads a parameter that the route defines. A deferred screen wraps its content in `DeferredLocalizations`, and its dialogs and sheets are opened with `showLocalizedDialog` or `showLocalizedSheet`, because a dialog is a sibling route of the page and does not inherit those localizations. Each microfrontend's repository is declared with `RepositoryBinding` and the screen requests it with `scope.repository(...)`; in demo mode, the fakes use `DemoBehavior` for latency, scheduled failures and closing. Localization, theme and access are read in the screen's `build`, inside the deferred chunk.
- **Identity:** `ShellRuntime.identityEpoch` increases with every change of user or tenant. `ShellRouterFactory` wraps each page in a `KeyedSubtree` with that value, so a mounted screen is rebuilt from scratch for the new identity. If the new identity cannot use the microfrontend, the page is emptied until the redirect removes it.
- **Lifecycle:** `lifecycleFactory: () => MyLifecycle()` replaced `lifecycle:`, which no longer exists. The runtime creates one instance per activation, with no state shared between runtimes. Events are sent with `ShellContext.emit` and listened to with `ShellContext.listen`; when the identity rotates the context is cancelled synchronously and discards whatever arrives late. `ShellContext` no longer exposes `eventBus`. If `initialize` fails, the runtime releases it and retries with increasing backoff (1 s, 2 s, 4 s... up to 5 min).
- **Screen events:** a screen emits with `MicrofrontendScope.emit`, which discards the event when the scope was already closed by an identity change. `ShellServices` does not expose the bus: neither screens nor lifecycles touch it directly.
- **Manifest:** it declares its `id` (`MicrofrontendId('tasks')`, also the first segment of its routes), and the registry rejects repeated ids or ids that do not work as a URL segment. Each `MenuEntry` carries its label (`MenuLabel` with one text per language, which the registry requires for every supported language), its icon and, if it has one, its badge (`MenuBadge<E>`, which the shell feeds with the latest `E` event). The microfrontend's own events live in its package, in folders that can go in the initial bundle. `deepLinks` translates the app links that start with its segment. Shared packages know no microfrontend.
- **Mode:** the shell decides once whether it is `ShellMode.demo` (demo sessions and in-memory repositories) or `ShellMode.live` (with `API_BASE_URL`). The manifest declares in `modes` the ones it serves; a live shell does not register a microfrontend that only has demo data, so it never shows made-up responses as if they came from the server.
- **Shell services:** `ShellServices` is built per identity and provides `session`, `mode`, `api`, `signOut()` and `requestStepUp()`. Each repository chooses its implementation with `mode`; `api` is the `ApiClient` with the session and throws `StateError` in demo mode, and a live shell without a client fails at startup instead of falling back to demo data. A real repository that does not cover an operation without a contract throws `UnsupportedError` and exposes what it can serve, so the screen does not offer the rest.
- **Resources:** repositories implement `ScopedResource`. The scope calls their `dispose()` when it closes, without an explicit callback.
- **Access:** `AccessRule.mfa(maxAge)` requires a recent second factor (`UserSession.mfaVerifiedAt`). If an authenticated session is only missing that factor, the router sends it to `/step-up?from=...` (`ShellPaths.stepUp`). Subroutes are protected with `ScreenRoute(access: ...)` or with `redirect: accessRedirect(rule)` in a `GoRoute`. Actions are protected with `AccessGate` or `context.can(rule)`. The menu shows the entries the session reaches after the step-up.
- **Step-up for an action:** before a sensitive action, the microfrontend calls `scope.services.requestStepUp()` when `context.can(rule)` is false. The shell opens its `/step-up` page with `StepUpRequests` from `shell_core` and answers true if the user verified the factor, with `UserSession.mfaVerifiedAt` already updated. It answers false if the user goes back, if the page leaves the stack without an answer (a `go` from the menu, a link or a redirect, which go_router does not complete) or if the identity changes. No microfrontend has its own second-factor dialog.
- **Real session:** with `--dart-define=API_BASE_URL=...`, each shell creates an `IdentityConnection` from the `auth` package (`SessionManager`, `ApiAuthRepository` and an `ApiClient` with `accessToken: sessionManager.accessToken` and a `SessionRefreshPolicy` that refreshes and retries on the codes in `IdentityConnection.refreshCodes`; on web, `CookieTokenStore` and a browser client with credentials). The connection owns the transport, which cuts each request at 30 s, and closes it when released. The `UserSession` is filled with `UserSession.fromAccess` from `GET /v1/me/access` (`SessionAccess`: permissions, platform roles, features, flags and `mfaVerifiedAt`), is reloaded after each refresh and goes back to anonymous when identity closes the session. Without the variable, the shells keep using the demo sessions and the fakes.
- **Layout:** each screen owns the single top bar with `AppPage` (title, actions, back). The shell uses `ShellChrome`, which draws no bar: in compact it publishes its actions (sign out) and `AppPage` adds them to its bar; on wide screens they go in the rail. `AdaptiveScaffold` no longer has `compactActions`.
- **Generator:** a new microfrontend is born with `front/tools/new_microfrontend.dart`, which creates its package with this contract. The decision and its alternatives are in [ADR 0027](0027-patrones-de-pantalla-y-pruebas-del-front.md).
- **States and errors:** each screen has an `XController` (`ChangeNotifier`) tested without widgets. Its loading is composed by an `AsyncLoader` from `ui`, which discards the response of a stale call. Its actions go through `ActionRunner`, which returns `ActionSucceeded`, `ActionFailed` or `ActionSkipped`. The screen is a `StatelessWidget` that creates the controller with `ControllerBuilder`, and shows the states with `AsyncValueView` (loading, error and data). The result of an action is shown with `showActionResult`, which does nothing if the context is no longer mounted. An error is described with `ErrorPresenter` from `i18n`, which returns `ErrorDetails`: the text comes from the code's catalog and never from the server. The shells clear the SnackBars when the identity changes.

## Consequences

### Positive

- No data, event, resource or message from one user reaches the next without each microfrontend having to remember it.
- Screens do not depend on the router's `BuildContext` and are tested by mounting `manifest.buildRoutes(...)`.
- A single top bar at every width.

### Costs

- Until a microfrontend migrates to `AppPage`, its screens in compact do not show the shell's sign-out action.
- Routes inside a `StatefulShellRoute` or with `pageBuilder` are not rebuilt per identity. Manifests use `screens`.
- `accessRedirect` outside `ShellRouterFactory` needs a `ShellAccessScope` above the router and fails if it does not find one.
- The interface hides what the user cannot use, but the authority is still the API.
- On mobile the session token lives in memory until the Keychain or Keystore adapter exists, and without a real `DeviceKeyPort` sign-in does not register the device.
- With a real API only the microfrontends that have a real adapter appear; today, the account, and within it only sessions and devices.

## Alternatives considered

- Reloading the whole app on identity change: it loses navigation and does not solve the lifecycle's late events.
- Having each screen listen to the session and clear its state: it depends on seven teams remembering it on every screen.
- Keeping the shell bar in compact: it duplicates the top bar and separates the screen's actions from the shell's.
