# mf_notifications

Microfrontend de notificaciones: bandeja, preferencias por tipo y canal, horario de silencio. Cumple el contrato de [ADR 0018](../../../docs/adr/0018-contrato-de-microfrontend.md).

## Rutas

El manifiesto declara `screens: [ScreenRoute(...)]`; las rutas están en `NotificationsPaths` (`lib/src/shared/constants`).

- `/notifications`: bandeja con no leídas y leídas, marcado al tocar, "Marcar todas como leídas" y llegada en vivo arriba. Si marcar falla, la lista vuelve atrás y `showActionError` avisa.
- `/notifications/preferences` (hija de `/notifications`): matriz de tipos por canales (en la app, push, correo). Las alertas de seguridad están fijas en activo. Horario de silencio con inicio y fin. Si un guardado falla, la preferencia vuelve atrás y `showActionError` avisa.

Ambas rutas exigen sesión iniciada (regla del manifiesto); no hay permisos propios de notificaciones. Cada pantalla dibuja su única barra con `AppPage` y muestra carga, error y datos con `AsyncValueView`.

## Carga diferida

`lib/mf_notifications.dart` viaja en el bundle inicial. Ni él ni el ciclo de vida importan `src/data`, `src/screens` o `src/l10n` sin `deferred as`:

- Las pantallas se cargan con `screens.loadLibrary` desde cada `ScreenRoute`.
- `NotificationsLifecycle.initialize` carga `src/data/notifications_scope.dart` con `deferred as` y obtiene el repositorio del scope.

`test/deferred_boundary_test.dart` recorre el grafo de imports del manifiesto. En CI, `tools/check_deferred_chunks.dart` lo comprueba sobre el `main.dart.js.map` real.

## Datos

- `NotificationsRepository` (interfaz) es un `ScopedResource`. `FakeNotificationsRepository` lo implementa en memoria; `push(...)` simula una notificación en vivo (en producción, SSE o Socket.IO). No hay contrato de notificaciones en `package:contracts` todavía, así que no hay implementación HTTP.
- `notificationsRepositoryOf(scope)` (`lib/src/data/notifications_scope.dart`) es el único acceso al repositorio. Lifecycle y pantallas piden la misma instancia al scope de la identidad. Al cambiar de identidad el scope se cierra y llama a `dispose()`, que termina `live()` y `watchUnreadCount()`.
- Tipos y enums compartidos en `lib/src/shared/{enums,constants,types}` con las reglas de ADR 0015.

## Eventos

- `UnreadCountChanged` viene de `shell_core`. El runtime crea un `NotificationsLifecycle` por activación (`lifecycleFactory`); escucha `watchUnreadCount()` y publica con `ShellContext.emit`, que descarta lo que llegue después de cambiar de identidad. El shell lo usa para el badge.

## Textos

- `l10n.yaml` y ARB en `lib/src/l10n/` (plantilla `app_es.arb`, y `app_en.arb`). Genera `NotificationsLocalizations` en `lib/src/l10n/generated/`, versionado.
- `buildInboxScreen` y `buildPreferencesScreen` envuelven la pantalla en `NotificationsLocalized` dentro del chunk diferido, así sus textos no están en el bundle principal.

## Desarrollo

```sh
flutter gen-l10n
flutter analyze
flutter test
```
