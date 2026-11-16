# mf_notifications

Microfrontend de notificaciones: bandeja, preferencias por tipo y canal, y horario de silencio. Cumple el contrato de [ADR 0018](../../../docs/adr/0018-contrato-de-microfrontend.md).

## Rutas

El manifiesto declara `ScreenRoute.deferred` para cada pantalla. Las rutas están en `NotificationsPaths` (`lib/src/shared/constants`).

- `/notifications`: bandeja con no leídas y leídas, marcado al tocar, "Marcar todas como leídas" y llegada en vivo arriba. Si marcar falla, solo esa notificación vuelve a no leída, las llegadas en vivo se conservan y `showActionResult` avisa.
- `/notifications/preferences` (hija de `/notifications`): matriz de tipos por canales (en la app, push y correo). Las alertas de seguridad están fijas en activo. Horario de silencio con inicio y fin. Los cambios se guardan uno a la vez y en orden. Si un guardado falla y no hay un cambio más nuevo, la preferencia vuelve a la última guardada; si hay uno más nuevo, su guardado ya lleva ese cambio y no se revierte.

Ambas rutas exigen sesión iniciada (regla del manifiesto); no hay permisos propios de notificaciones. Cada pantalla dibuja su única barra con `AppPage` y muestra carga, error y datos con `AsyncValueView`.

## Estructura

- `lib/src/screens/`: una pantalla (`StatelessWidget`) por ruta, sobre su controlador (`InboxController`, `PreferencesController`). Los controladores son `ChangeNotifier` y reciben el repositorio por constructor.
- `lib/src/screens/screens.dart`: `NotificationsScreens` construye cada pantalla para un `MicrofrontendScope` y la envuelve en `DeferredLocalizations`.
- `test/` espeja `lib/src/`: `screens/`, `data/`, `lifecycle/`, `l10n/` y `shared/`. Los utilitarios de prueba están en `test/utils/`.

## Carga diferida

`lib/mf_notifications.dart` viaja en el bundle inicial. Ni él ni el ciclo de vida importan `src/data`, `src/screens` o `src/l10n` sin `deferred as`:

- Las pantallas se cargan con `screens.loadLibrary` desde cada `ScreenRoute.deferred`.
- `NotificationsLifecycle.initialize` carga `src/data/notifications_data.dart` con `deferred as` y obtiene el repositorio del scope.

`front/tools/check_microfrontend_boundaries.dart` (en `analyze`) recorre el grafo de imports del manifiesto. En CI, `tools/check_deferred_chunks.dart` lo comprueba sobre el `main.dart.js.map` real.

## Datos

- `NotificationsData.repository` (un `RepositoryBinding`, en `lib/src/data/notifications_data.dart`) es el único acceso al repositorio. Se obtiene con `scope.repository(NotificationsData.repository)`; lifecycle y pantallas reciben así la misma instancia de la identidad.
- `NotificationsRepository` (interfaz) es un `ScopedResource`. Al cambiar de identidad el scope se cierra y llama a `dispose()`, que termina `live()` y `watchUnreadCount()`.
- `FakeNotificationsRepository` lo implementa en memoria. Recibe un `DemoBehavior` para la latencia y los fallos programados por operación; `push(...)` simula una notificación en vivo (en producción, SSE o Socket.IO).
- No hay contrato de notificaciones en `package:contracts` todavía, así que solo existe el modo demo.
- Tipos y enums compartidos en `lib/src/shared/{enums,constants,types}`.

## Eventos

- `UnreadCountChanged` es un evento de este microfrontend (`lib/src/lifecycle/unread_count_changed.dart`, exportado por `mf_notifications.dart`). El runtime crea un `NotificationsLifecycle` por activación (`lifecycleFactory`); escucha `watchUnreadCount()` y publica con `ShellContext.emit`, que descarta lo que llegue después de cambiar de identidad.
- La entrada de menú lo declara como insignia (`MenuBadge<UnreadCountChanged>`), así el shell dibuja el número sin conocer este microfrontend.

## Textos

- `l10n.yaml` y ARB en `lib/src/l10n/` (plantilla `app_es.arb`, y `app_en.arb`). Genera `NotificationsLocalizations` en `lib/src/l10n/generated/`, versionado.
- `NotificationsScreens` envuelve cada pantalla en `DeferredLocalizations` dentro del chunk diferido, así sus textos no están en el bundle principal.

## Desarrollo

```sh
flutter gen-l10n
flutter analyze
flutter test
```
