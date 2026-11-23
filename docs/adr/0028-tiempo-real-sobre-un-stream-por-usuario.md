# 0028. Tiempo real sobre un stream por usuario

- Estado: Aceptada
- Fecha: 2026-11-22
- Relacionados: [ADR 0011](0011-tiempo-real-socketio-sse.md), [ADR 0021](0021-adaptador-valkey.md), [ADR 0022](0022-verificacion-de-tokens-y-estado-de-revocacion-compartido.md)

## Contexto

El ADR 0011 pide SSE y Socket.IO alimentados por el mismo origen, recuperación tras un corte con `Last-Event-ID` y con connection state recovery de Socket.IO sobre un Valkey Stream, y que las conexiones escalen entre instancias. El diseño de F5 a F11 agrega que el tiempo real puede vivir dentro de `notifications` o en `apps/realtime`, elegido por configuración, y que el canal autentica con access token o con cookie.

La connection state recovery de Socket.IO guarda los paquetes que emitió una instancia, así que solo recupera lo que pasó por `io.emit` de algún servidor de Socket.IO. Cuando `apps/realtime` atiende las conexiones, quien decide qué enviar (`notifications`) no tiene servidor de Socket.IO, y SSE necesita su propio registro de lo enviado. Mantener dos mecanismos de recuperación es justo lo que el ADR 0011 quería evitar.

## Decisión

- El origen único es un Valkey Stream por usuario (`<prefijo>:rt:{usuario}`) con las últimas tramas y vida limitada (`REALTIME_STREAM_RETAINED`, `REALTIME_STREAM_TTL`). Cada trama nueva publica un aviso en `<prefijo>:rt-appended:{usuario}`; el aviso no trae la trama, así que perder uno solo atrasa la entrega hasta el siguiente o hasta el latido de la conexión, que vuelve a leer.
- `@platform/realtime` define los puertos `RealtimeStream`, `PresenceTracker`, `StreamAuthenticator` y `RealtimeTransport`. `SseTransport` y `SocketIoTransport` comparten `RealtimeSession`: al abrir fija su posición en el stream, avisa al cliente que ya escucha (`ready`) y entrega en orden y sin repetir.
- Reanudar es igual en los dos transportes: SSE con `Last-Event-ID`, que el navegador manda solo al reconectar, y Socket.IO con `auth.lastEventId` en el handshake. Sin id, o con uno que el stream no reconoce, la conexión empieza al final del stream (`RealtimeStream.resumePoint`): lo anterior ya lo trae la API, y un id inventado no reproduce lo retenido.
- Si el stream falla con la conexión abierta (Valkey cae durante un aviso o un latido), la sesión se cierra en lugar de quedar abierta sin entregar: el cliente reconecta con el id de la última trama recibida y no pierde ninguna.
- Socket.IO se monta sobre el servidor HTTP del proceso, solo con WebSocket, sin `@nestjs/websockets` ni el adaptador de streams: cada instancia lee el stream de sus propios usuarios y no hay difusión entre instancias que coordinar.
- Una revocación es una trama más, con `closesSession` (una sesión o todas con `*`): llega por el mismo camino ordenado y cierra la conexión después de entregarse.
- La revocación de un tenant no nombra usuarios, así que no puede llegar como trama. Cada conexión guarda el tenant de su token y, en cada latido, consulta la época de ese tenant en el estado compartido de identity (`StreamRevocations` sobre `AuthStateReader`). Si la época es posterior al segundo en que se abrió la conexión, o el tenant está suspendido, la conexión se cierra: el token ya pasó la verificación al abrir, así que su `iat` no supera ese segundo. Si el estado no responde, la conexión sigue y el siguiente latido vuelve a consultar.
- `BearerStreamAuthenticator` lee `Authorization` y `CookieStreamAuthenticator` lee el access token de una cookie (`REALTIME_AUTH_COOKIE`), porque `EventSource` no puede enviar cabeceras. Los dos verifican en local con el JWKS y el estado compartido de identity; ninguna operación del contrato permite verificar la cookie de sesión opaca de identity.
- `RealtimeModule.forRoot` recibe si el proceso atiende conexiones. `notifications` lo decide con `REALTIME_HOST`; `apps/realtime` siempre atiende y lee el stream con el prefijo de Valkey de `notifications`.

## Consecuencias

Positivas:

- Una sola forma de recuperar, probada igual en los dos transportes y con dos instancias que comparten Valkey.
- Las conexiones no dependen de la instancia: un cliente puede reconectarse a cualquiera.
- `notifications` publica igual si atiende las conexiones o si lo hace `apps/realtime`.

Costos:

- Cada proceso mantiene una suscripción de pub/sub por usuario conectado, sobre una sola conexión de Valkey.
- Cada latido de cada conexión lee la época de su tenant (con la caché local de `CachedAuthStateReader`), y una revocación de tenant tarda hasta un latido (`REALTIME_HEARTBEAT`, 15 s) en cerrar las conexiones.
- Lo que sale de la retención del stream ya no se recupera; el cliente vuelve a pedir la bandeja por la API.
- `apps/realtime` necesita el mismo prefijo de Valkey que `notifications`, así que su usuario de Valkey tiene la ACL de ese prefijo.

## Alternativas consideradas

- Connection state recovery con `@socket.io/redis-streams-adapter`: solo recupera lo emitido por un servidor de Socket.IO y deja a SSE con otro mecanismo.
- Un `XREAD BLOCK` por conexión: bloquea una conexión de Valkey por cliente conectado.
