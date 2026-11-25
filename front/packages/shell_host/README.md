# shell_host

What the web and mobile shells share. A shell only contributes its manifests, its navigation frame and, with a real API, its `IdentityConnection`.

- `ShellHost`: registry, session, `ShellRuntime`, router from `buildShellRouter`, additional step (`StepUpRequests`), menu badges and mode. Without a connection the shell is `ShellMode.demo`; with a connection it is `ShellMode.live` and does not register the manifests that only serve demo data. On startup it tries to restore the session: without network the user stays on the login, and any other failure is reported with `FlutterError.reportError`.
- `ShellHostApp`: `MaterialApp.router` with theme, localization and `ShellAccessScope`; it starts and releases the host.
- Pages: `LoginPage` (real with `SignInForm` or demo with `DemoProfile`), `StepUpPage` (`StepUpForm` or the demo button) and `ForbiddenPage`. The forms draw the `SignInFlow` and `StepUpFlow` flows from the `auth` package.
- `safeReturnLocation`: only accepts internal routes in `from`.
- `shellScreenLoader`: deferred loading with a loading view and a translated error with retry.

```dart
final host = ShellHost(
  platform: AppPlatform.web,
  manifests: [accountManifest, tasksManifest],
  connection: connection, // null in demo
  demoProfiles: const [DemoProfile.customer],
  scaffold: (context, host, location, child) =>
      MyScaffold(host: host, location: location, child: child),
);
runApp(ShellHostApp(host: host));
```
