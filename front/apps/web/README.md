# web_shell

Flutter shell for the web. It composes the microfrontends that declare `AppPlatform.web` on top of `shell_host`.

## What it does

- `lib/main.dart` starts `ShellHostApp` with the `ShellHost` from `buildWebHost`. With `--dart-define=API_BASE_URL=...` it passes the real connection from `lib/src/config.dart` (httpOnly cookie and a browser client with credentials).
- `lib/src/web_shell.dart`: `webManifests` (`account`, `tasks`, `notifications`, `assistant`, `billing`, `backoffice`), the demo profiles it offers and the frame.
- `lib/src/pages/web_shell_scaffold.dart`: `ShellChrome` without a top bar (each screen draws its own with `AppPage`). Label, icon and badge of each destination come from the manifest's `MenuEntry`; the shell knows no microfrontend.

Session, login, additional step, `/forbidden`, router, badges and demo or live mode belong to `shell_host`.

## Demo mode

Without `API_BASE_URL`, `/login` does not validate credentials and offers three profiles: customer, tenant administrator and super administrator. With a real API only the microfrontends that declare `ShellMode.live` appear.

## Tests

```sh
cd front/apps/web
flutter analyze
flutter test
```

`test/web_shell_test.dart` mounts the shell with the real manifests: redirects, menu per profile, `/forbidden`, sign-out, notifications badge, isolation between users, additional step and the real session with a test `IdentityConnection`. It loads the deferred libraries in `setUpAll` (see `loadDeferredLibraries` in `package:shell_core/testing.dart`).
