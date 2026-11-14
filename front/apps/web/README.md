# web_shell

Shell Flutter para web. Compone los microfrontends que declaran `AppPlatform.web` sobre `shell_host`.

## Qué hace

- `lib/main.dart` arranca `ShellHostApp` con el `ShellHost` de `buildWebHost`. Con `--dart-define=API_BASE_URL=...` le pasa la conexión real de `lib/src/config.dart` (cookie httpOnly y cliente del navegador con credenciales).
- `lib/src/web_shell.dart`: `webManifests` (`account`, `tasks`, `notifications`, `assistant`, `billing`, `backoffice`), los perfiles de demostración que ofrece y el marco.
- `lib/src/pages/web_shell_scaffold.dart`: `ShellChrome` sin barra superior (cada pantalla dibuja la suya con `AppPage`). Etiqueta, icono e insignia de cada destino salen de la `MenuEntry` del manifiesto; el shell no conoce ningún microfrontend.

Sesión, login, paso adicional, `/forbidden`, router, insignias y modo demo o vivo son de `shell_host`.

## Modo demostración

Sin `API_BASE_URL`, `/login` no valida credenciales y ofrece tres perfiles: cliente, administrador del tenant y superadministrador. Con API real solo aparecen los microfrontends que declaran `ShellMode.live`.

## Pruebas

```sh
cd front/apps/web
flutter analyze
flutter test
```

`test/web_shell_test.dart` monta el shell con los manifiestos reales: redirecciones, menú por perfil, `/forbidden`, cierre de sesión, insignia de notificaciones, aislamiento entre usuarios, paso adicional y la sesión real con una `IdentityConnection` de prueba. Carga las librerías diferidas en `setUpAll` (ver `loadDeferredLibraries` en `package:shell_core/testing.dart`).
