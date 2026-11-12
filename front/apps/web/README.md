# web_shell

Shell Flutter para web. Compone los microfrontends que declaran `AppPlatform.web`.

## Qué hace

- `lib/main.dart` arranca `WebShellApp` con un `WebShell`.
- `lib/src/web_shell.dart`: registro con los seis manifests web (`account`, `tasks`,
  `notifications`, `assistant`, `billing`, `backoffice`), la sesión (`ValueNotifier<UserSession>`),
  el `ShellRuntime` (con `servicesFactory` y `DefaultShellServices`) y el router de `buildShellRouter`.
- Rutas del shell: `/` (`homeLocation`, primer elemento visible del menú), `/login`, `/forbidden`.
  Las rutas de los microfrontends van dentro del `shellBuilder`, que dibuja `WebShellScaffold`.
- `lib/src/pages/web_shell_scaffold.dart`: `AdaptiveScaffold` sin `AppBar` (cada pantalla tiene
  el suyo). Cerrar sesión va en `railTrailing` y `compactActions`. El destino de Notificaciones
  usa `badgeCount` con el valor de `UnreadCountChanged` de `shell_core`.
- `lib/src/navigation/shell_navigation.dart`: iconos por `MicrofrontendId`. Las etiquetas salen de
  `menuLabel` del paquete `i18n`.
- Las pantallas de cada microfrontend se cargan diferidas (`deferredPage`).

## Modo demostración

`/login` no valida credenciales. Ofrece tres perfiles (`lib/src/demo_sessions.dart`):

- Cliente: `tasks:read`, sin funciones de plan.
- Admin de tenant: `tasks:read`, `tasks:write`, `billing:read`, planes `ai_assistant` y `billing`.
- Superadmin de plataforma: rol `super_admin`.

Cerrar sesión (icono en la barra lateral o superior) lleva a `/login` sin `from` y descarta
los objetos del usuario anterior. `/forbidden` también ofrece cerrar sesión.

## Pruebas

```sh
cd front/apps/web
flutter analyze
flutter test
```

`test/web_shell_test.dart` cubre el redireccionamiento anónimo, el retorno tras `from`,
la visibilidad del menú por perfil, `/forbidden` con cierre de sesión, el cierre de sesión,
las etiquetas en español, el badge de notificaciones, que cada ruta aparezca una vez y el
aislamiento entre usuarios (una tarea del admin no aparece al entrar como cliente).

## Pendiente

- Nada en el shell. Los microfrontends deben compilar para que las pruebas se ejecuten.
