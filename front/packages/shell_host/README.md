# shell_host

Lo que comparten los shells web y móvil. Un shell solo aporta sus manifiestos, su marco de navegación y, con API real, su `IdentityConnection`.

- `ShellHost`: registro, sesión, `ShellRuntime`, router de `buildShellRouter`, paso adicional (`StepUpRequests`), insignias del menú y modo. Sin conexión el shell es `ShellMode.demo`; con conexión es `ShellMode.live` y no registra los manifiestos que solo sirven datos de demostración. Al arrancar intenta recuperar la sesión: sin red el usuario se queda en el login, y cualquier otro fallo se reporta con `FlutterError.reportError`.
- `ShellHostApp`: `MaterialApp.router` con tema, localización y `ShellAccessScope`; arranca y libera el host.
- Páginas: `LoginPage` (real con `SignInForm` o de demostración con `DemoProfile`), `StepUpPage` (`StepUpForm` o el botón de demostración) y `ForbiddenPage`. Los formularios dibujan los flujos `SignInFlow` y `StepUpFlow` del paquete `auth`.
- `safeReturnLocation`: solo acepta rutas internas en `from`.
- `shellScreenLoader`: carga diferida con vista de carga y error traducido con reintento.

```dart
final host = ShellHost(
  platform: AppPlatform.web,
  manifests: [accountManifest, tasksManifest],
  connection: connection, // null en demo
  demoProfiles: const [DemoProfile.customer],
  scaffold: (context, host, location, child) =>
      MyScaffold(host: host, location: location, child: child),
);
runApp(ShellHostApp(host: host));
```
