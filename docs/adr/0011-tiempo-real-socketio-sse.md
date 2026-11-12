# 0011. Tiempo real con Socket.IO y SSE

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

Algunas pantallas necesitan enviar y recibir en tiempo real, como la colaboración en tasks o la presencia. Otras solo reciben: notificaciones, estado de jobs y códigos de MFA. Las conexiones deben sobrevivir a un corte y escalar horizontalmente.

## Decisión

`apps/realtime` es un gateway de NestJS en Fargate, detrás de un ALB, con dos canales alimentados por el mismo origen de mensajes.

- Socket.IO (`@WebSocketGateway`) para comunicación bidireccional. Autentica con el JWT en el handshake.
- SSE (`@Sse()`) para envío del servidor al cliente. Autentica con la cookie de sesión.
- Escala con el adaptador de Socket.IO sobre Valkey. El transporte es solo WebSocket, así el balanceador no usa sesiones pegajosas.
- Recuperación tras un corte: connection state recovery en Socket.IO y `Last-Event-ID` en SSE, con los mensajes de los últimos minutos guardados en un Valkey Stream.
- `notifications` decide qué enviar. `realtime` solo entrega, mediante el puerto `RealtimeGateway`.
- Con la app o el navegador cerrados, el envío pasa a Web Push, APNs o FCM.

## Consecuencias

Positivas:

- SSE usa HTTP normal, atraviesa proxies y reconecta solo.
- Un código de MFA llega aunque la conexión se haya caído durante unos segundos.
- El balanceador no necesita sesiones pegajosas.

Costos:

- Hay dos canales que mantener, con el mismo origen de mensajes.
- Al revocar tokens, el gateway debe cerrar las conexiones de esas sesiones en el acto.
- El Valkey Stream necesita retención suficiente para cubrir el periodo de recuperación.

## Alternativas consideradas

- Transporte con sesiones pegajosas en el balanceador: el documento lo evita al fijar el transporte solo en WebSocket.
- Push nativo para todo: el documento lo reserva para la app cerrada. Con la app abierta se usa WebSocket o SSE.
