# 0011. Real time with Socket.IO and SSE

- Status: Accepted, amended by [ADR 0028](0028-real-time-one-stream-per-user.md) and [ADR 0034](0034-live-front-repositories-sse-region.md)
- Updated: 2026-11-24 (the front's SSE client)
- Date: 2026-11-11

## Context

Some screens need to send and receive in real time, such as collaboration on tasks or presence. Others only receive: notifications, job status and MFA codes. Connections must survive an outage and scale horizontally.

## Decision

`apps/realtime` is a NestJS gateway on Fargate, behind an ALB, with two channels fed by the same message source.

- Socket.IO (`@WebSocketGateway`) for bidirectional communication. It authenticates with the JWT in the handshake.
- SSE for server-to-client delivery, at `GET /v1/notifications/stream`. It authenticates with the access token in `Authorization` or with the session cookie. In the front, `SseNotificationsStream` reads it with `package:http` and the session token, and resumes with `Last-Event-ID`.
- It scales with the Socket.IO adapter on Valkey. The transport is WebSocket only, so the load balancer does not use sticky sessions.
- Recovery after an outage: connection state recovery in Socket.IO and `Last-Event-ID` in SSE, with the messages of the last few minutes stored in a Valkey Stream.
- `notifications` decides what to send. `realtime` only delivers, through the `RealtimeGateway` port.
- With the app or the browser closed, delivery falls back to Web Push, APNs or FCM.

## Consequences

Positive:

- SSE uses plain HTTP, goes through proxies and reconnects on its own.
- An MFA code arrives even if the connection dropped for a few seconds.
- The load balancer does not need sticky sessions.

Costs:

- There are two channels to maintain, with the same message source.
- When tokens are revoked, the gateway must close the connections of those sessions immediately.
- The Valkey Stream needs enough retention to cover the recovery period.

## Alternatives considered

- Transport with sticky sessions on the load balancer: the document avoids it by fixing the transport to WebSocket only.
- Native push for everything: the document reserves it for the closed app. With the app open, WebSocket or SSE is used.
