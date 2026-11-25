# 0028. Real time over one stream per user

- Status: Accepted
- Date: 2026-11-22
- Related: [ADR 0011](0011-real-time-socketio-sse.md), [ADR 0021](0021-valkey-adapter.md), [ADR 0022](0022-token-verification-shared-revocation-state.md)

## Context

ADR 0011 asks for SSE and Socket.IO fed by the same source, recovery after a disconnection with `Last-Event-ID` and with Socket.IO connection state recovery over a Valkey Stream, and connections that scale across instances. The F5 to F11 design adds that real time can live inside `notifications` or in `apps/realtime`, chosen by configuration, and that the channel authenticates with an access token or with a cookie.

Socket.IO connection state recovery keeps the packets an instance emitted, so it only recovers what went through `io.emit` on some Socket.IO server. When `apps/realtime` serves the connections, whoever decides what to send (`notifications`) has no Socket.IO server, and SSE needs its own record of what was sent. Keeping two recovery mechanisms is exactly what ADR 0011 wanted to avoid.

## Decision

- The single source is one Valkey Stream per user (`<prefix>:rt:{user}`) with the latest frames and a limited lifetime (`REALTIME_STREAM_RETAINED`, `REALTIME_STREAM_TTL`). Each new frame publishes a notice on `<prefix>:rt-appended:{user}`; the notice does not carry the frame, so losing one only delays delivery until the next one or until the connection's heartbeat, which reads again.
- `@platform/realtime` defines the ports `RealtimeStream`, `PresenceTracker`, `StreamAuthenticator` and `RealtimeTransport`. `SseTransport` and `SocketIoTransport` share `RealtimeSession`: on opening it sets its position in the stream, tells the client it is already listening (`ready`) and delivers in order and without repeats.
- Resuming is the same in both transports: SSE with `Last-Event-ID`, which the browser sends only when reconnecting, and Socket.IO with `auth.lastEventId` in the handshake. Without an id, or with one the stream does not recognize, the connection starts at the end of the stream (`RealtimeStream.resumePoint`): the earlier data already comes from the API, and a made-up id does not replay what is retained.
- If the stream fails while the connection is open (Valkey goes down during a notice or a heartbeat), the session closes instead of staying open without delivering: the client reconnects with the id of the last frame received and loses none.
- Socket.IO is mounted on the process's HTTP server, WebSocket only, without `@nestjs/websockets` or the streams adapter: each instance reads its own users' stream and there is no broadcast between instances to coordinate.
- A revocation is one more frame, with `closesSession` (one session, or all of them with `*`): it arrives through the same ordered path and closes the connection after being delivered.
- A tenant revocation names no users, so it cannot arrive as a frame. Each connection keeps its token's tenant and, on every heartbeat, checks that tenant's epoch in identity's shared state (`StreamRevocations` on `AuthStateReader`). If the epoch is later than the second the connection was opened, or the tenant is suspended, the connection closes: the token already passed verification on opening, so its `iat` does not exceed that second. If the state does not respond, the connection continues and the next heartbeat checks again.
- `BearerStreamAuthenticator` reads `Authorization` and `CookieStreamAuthenticator` reads the access token from a cookie (`REALTIME_AUTH_COOKIE`), because `EventSource` cannot send headers. Both verify locally with the JWKS and identity's shared state; no contract operation allows verifying identity's opaque session cookie.
- `RealtimeModule.forRoot` receives whether the process serves connections. `notifications` decides it with `REALTIME_HOST`; `apps/realtime` always serves and reads the stream with the Valkey prefix of `notifications`.

## Consequences

Positive:

- A single way to recover, tested the same in both transports and with two instances sharing Valkey.
- Connections do not depend on the instance: a client can reconnect to any of them.
- `notifications` publishes the same way whether it serves the connections or `apps/realtime` does.

Costs:

- Each process keeps one pub/sub subscription per connected user, over a single Valkey connection.
- Every heartbeat of every connection reads its tenant's epoch (with the local cache of `CachedAuthStateReader`), and a tenant revocation takes up to one heartbeat (`REALTIME_HEARTBEAT`, 15 s) to close the connections.
- What falls out of the stream's retention can no longer be recovered; the client requests the inbox again through the API.
- `apps/realtime` needs the same Valkey prefix as `notifications`, so its Valkey user has the ACL for that prefix.

## Alternatives considered

- Connection state recovery with `@socket.io/redis-streams-adapter`: it only recovers what a Socket.IO server emitted and leaves SSE with another mechanism.
- One `XREAD BLOCK` per connection: it ties up one Valkey connection per connected client.
