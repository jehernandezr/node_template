import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type {
  RealtimeHost,
  StreamRequestHandler,
} from '../../realtime-host.js';

/** Servidor HTTP mínimo en un puerto libre que atiende las rutas `GET` que registran los transportes. */
export class TestRealtimeHost implements RealtimeHost {
  private readonly routes = new Map<string, StreamRequestHandler>();
  readonly server: Server = createServer((request, response) => {
    const handler = this.routes.get(request.url ?? '');
    if (request.method === 'GET' && typeof handler === 'function') {
      handler(request, response);
      return;
    }
    // Socket.IO atiende sus propias rutas sobre este mismo servidor.
    if (!(request.url ?? '').startsWith('/socket.io/')) {
      response.writeHead(404).end();
    }
  });

  get(path: string, handler: StreamRequestHandler): void {
    this.routes.set(path, handler);
  }

  async listen(): Promise<void> {
    await new Promise<void>((resolve) =>
      this.server.listen(0, '127.0.0.1', resolve),
    );
  }

  url(): string {
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  async close(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}
