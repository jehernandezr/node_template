# mobile_shell

Shell móvil de Flutter. Compone los microfrontends con `shell_core` y dibuja la navegación con `ui`.

## Cómo está armado

- `lib/src/registry.dart`: registro con los manifiestos de los microfrontends que usa el móvil.
- `lib/src/app.dart`: `MobileShellApp` crea el `ShellRuntime` y el router. El `servicesFactory` entrega un `DefaultShellServices` por identidad, cuyo `onSignOut` llama a `signOutAndGoToLogin`. Un `UnreadCountChanged` alimenta la insignia de Notificaciones; al cambiar de identidad la insignia vuelve a 0.
- `lib/src/router.dart`: `buildMobileRouter` llama a `buildShellRouter` con el registro real, así las rutas de los microfrontends se validan al arrancar. Las rutas de la shell son `/`, `/login` y `/forbidden`.
- `lib/src/screen_loader.dart`: `mobileScreenLoader` es el `load` de las rutas. Muestra `LoadingView` mientras carga la librería y, si falla, un `ErrorView` con el mensaje y el botón de reintentar traducidos con `AppLocalizations`.
- `lib/src/shell/mobile_shell_scaffold.dart`: `AdaptiveScaffold` sin AppBar propio (cada pantalla tiene el suyo). El cierre de sesión va en `compactActions` y en `railTrailing`. Más de cinco destinos se agrupan bajo "Más".
- `lib/src/login/`: login demo y página de acceso denegado. La de acceso denegado ofrece volver al inicio y cerrar sesión.
- `lib/src/deep_links/deep_link_mapper.dart`: traduce enlaces a rutas. Rechaza `tasks/new`, `tasks/edit` y cualquier id con esos nombres reservados.

## Reglas

- Cerrar sesión lleva a `/login` sin `from`, para que el siguiente usuario no caiga en la página del anterior.
- Los textos salen de `package:i18n`; las etiquetas de menú usan `menuLabel`.
- Las rutas de los microfrontends no se copian a mano: el router se construye desde el registro real.

## Verificación

```sh
flutter analyze
flutter test
```
