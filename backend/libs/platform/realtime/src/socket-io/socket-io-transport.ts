import type { IncomingMessage } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { StreamAuthenticator } from '../auth/stream-authenticator.js';
import type { StreamPrincipal } from '../auth/stream-principal.js';
import type { RealtimeHost } from '../realtime-host.js';
import { RealtimeTransport } from '../realtime-transport.js';
import { RealtimeConnections } from '../session/realtime-connections.js';
import { SocketSink } from './socket-sink.js';

/** Dónde se monta Socket.IO y quién puede abrirlo desde el navegador. */
export interface SocketIoTransportOptions {
  readonly namespace: string;
  readonly allowedOrigins: readonly string[];
}

interface HandshakeAuth {
  readonly token?: unknown;
  readonly lastEventId?: unknown;
}

/**
 * Socket.IO solo con WebSocket, así el balanceador no necesita sesiones pegajosas. El cliente manda
 * `auth.token` y, al reconectar, `auth.lastEventId`: recibe lo que se perdió desde el stream del usuario, que
 * comparten todas las instancias, sin depender de en cuál se conecte.
 *
 * El upgrade a WebSocket no tiene preflight y la opción `cors` solo pone cabeceras, así que el origen se
 * revisa en el handshake: sin eso, otra página podría abrir el socket con la cookie del usuario. Un cliente
 * que no es navegador no manda `Origin` y pasa.
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

  private async serve(socket: Socket): Promise<void> {
    const auth = socket.handshake.auth as HandshakeAuth;
    const connection = await this.connections.connect(
      socket.data as StreamPrincipal,
      new SocketSink(socket),
      typeof auth.lastEventId === 'string' ? auth.lastEventId : undefined,
    );
    // Un cliente que cortó durante la puesta al día ya no emitirá `disconnect`.
    if (socket.disconnected) {
      await connection.close();
      return;
    }
    socket.on('disconnect', () => void connection.close());
  }
}
