import type { IncomingMessage } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { StreamAuthenticator } from '../auth/stream-authenticator.js';
import type { StreamPrincipal } from '../auth/stream-principal.js';
import type { RealtimeHost } from '../realtime-host.js';
import { RealtimeTransport } from '../realtime-transport.js';
import { RealtimeConnections } from '../session/realtime-connections.js';
import { SocketSink } from './socket-sink.js';

/** Where Socket.IO is mounted and who can open it from the browser. */
export interface SocketIoTransportOptions {
  readonly namespace: string;
  readonly allowedOrigins: readonly string[];
}

interface HandshakeAuth {
  readonly token?: unknown;
  readonly lastEventId?: unknown;
}

/**
 * Socket.IO with WebSocket only, so the load balancer does not need sticky sessions. The client sends
 * `auth.token` and, when reconnecting, `auth.lastEventId`: it receives what was missed from the user's stream, which
 * all instances share, regardless of which one it connects to.
 *
 * The WebSocket upgrade has no preflight and the `cors` option only sets headers, so the origin is
 * checked in the handshake: without that, another page could open the socket with the user's cookie. A client
 * that is not a browser does not send `Origin` and passes.
 */
export class SocketIoTransport extends RealtimeTransport {
  private server: Server | undefined;

  constructor(
    private readonly connections: RealtimeConnections,
    private readonly authenticator: StreamAuthenticator,
    private readonly options: SocketIoTransportOptions,
  ) {
    super();
  }

  attach(host: RealtimeHost): void {
    this.server = new Server(host.server, {
      transports: ['websocket'],
      serveClient: false,
      cors: { origin: [...this.options.allowedOrigins], credentials: true },
      allowRequest: (request, callback) =>
        callback(null, this.allowsOrigin(request)),
    });
    const namespace = this.server.of(this.options.namespace);
    namespace.use((socket, next) => {
      this.authenticate(socket)
        .then((principal) => {
          socket.data = principal;
          next();
        })
        .catch((error: unknown) =>
          next(error instanceof Error ? error : new Error(String(error))),
        );
    });
    namespace.on('connection', (socket) => {
      this.serve(socket).catch(() => socket.disconnect(true));
    });
  }

  async close(): Promise<void> {
    await this.connections.closeAll();
    this.server?.disconnectSockets(true);
    this.server?.engine.close();
  }

  private allowsOrigin(request: IncomingMessage): boolean {
    const { origin } = request.headers;
    return origin === undefined || this.options.allowedOrigins.includes(origin);
  }

  private authenticate(socket: Socket): Promise<StreamPrincipal> {
    const auth = socket.handshake.auth as HandshakeAuth;
    return this.authenticator.authenticate({
      authorization:
        typeof auth.token === 'string'
          ? `Bearer ${auth.token}`
          : socket.handshake.headers.authorization,
      cookie: socket.handshake.headers.cookie,
    });
  }

  /**
   * A client that disconnected during the catch-up will no longer emit `disconnect`.
   */
  private async serve(socket: Socket): Promise<void> {
    const auth = socket.handshake.auth as HandshakeAuth;
    const connection = await this.connections.connect(
      socket.data as StreamPrincipal,
      new SocketSink(socket),
      typeof auth.lastEventId === 'string' ? auth.lastEventId : undefined,
    );
    if (socket.disconnected) {
      await connection.close();
      return;
    }
    socket.on('disconnect', () => void connection.close());
  }
}
