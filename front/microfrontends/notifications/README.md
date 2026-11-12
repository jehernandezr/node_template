# mf_notifications

Microfrontend de notificaciones: bandeja, preferencias por tipo y canal, horario de silencio.

## Rutas

- `/notifications`: bandeja con no leídas y leídas, marcado al tocar, "Marcar todas como leídas" y llegada en vivo arriba.
- `/notifications/preferences` (hija de `/notifications`): matriz de tipos por canales (en la app, push, correo). Las alertas de seguridad están fijas en activo. Horario de silencio con inicio y fin. Si un guardado falla, la preferencia vuelve atrás y un SnackBar avisa.

## Datos

- `NotificationsRepository` (abstracto) define el puerto. `FakeNotificationsRepository` lo implementa en memoria; `push(...)` simula una notificación en vivo (en producción, SSE o Socket.IO).
- `notificationsRepositoryOf(scope)` (`lib/src/data/notifications_scope.dart`) es el único acceso al repositorio. Lifecycle y pantallas piden la misma instancia al scope de la identidad, así que comparten estado. Un scope nuevo empieza con estado nuevo.
- `watchUnreadCount()` emite el valor actual al suscribirse y de nuevo con cada llegada en vivo y cada marcado como leído.

## Eventos

- `UnreadCountChanged` viene de `shell_core`. El lifecycle (eager, en el manifiesto) escucha `watchUnreadCount()` y lo publica. El shell lo usa para el badge.

## Textos

- `l10n.yaml` y ARB en `lib/src/l10n/` (plantilla `app_es.arb`, y `app_en.arb`). Genera `NotificationsLocalizations` en `lib/src/l10n/generated/`, versionado.
- Las pantallas van dentro de la página diferida con `withNotificationsLocalizations`, así sus textos no están en el bundle principal.

## Desarrollo

```sh
flutter gen-l10n
flutter analyze
flutter test
```
