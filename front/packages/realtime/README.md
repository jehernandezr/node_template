# realtime

Cliente de tiempo real para el front: mantiene una conexión viva, reconecta
con backoff y jitter pasando el último id recibido (para que el servidor
reenvíe los eventos perdidos), y descarta eventos repetidos por id. Los
adaptadores SSE y Socket.IO implementan el puerto `RealtimeTransport` y se
agregan después.

## API pública (`package:realtime/realtime.dart`)

- **Modelos**: `RealtimeEvent { id, type, data, receivedAt }`,
  `RealtimeStatus` (`connecting`, `connected`, `reconnecting`, `disconnected`).
- **Puerto**: `RealtimeTransport` con `connect({lastEventId})` y `close()`.
- **Backoff**: `RealtimeBackoff` (exponencial, con tope `max` y `jitter`).
- **Cliente**: `RealtimeClient(transport, {backoff, dedupeWindow})` con
  `start()`, `events`, `statuses`, `status`, `lastEventId`,
  `subscribe(type)` y `dispose()`.
- **Fake**: `FakeRealtimeTransport` con `emit`, `dropConnection`,
  `connectLog` y replay desde un id.

## Uso

```dart
final client = RealtimeClient(transport);
client.subscribe('mfa.code').listen(showCode);
client.start();
// ...
await client.dispose();
```

## Pruebas

```sh
flutter analyze && flutter test
```
