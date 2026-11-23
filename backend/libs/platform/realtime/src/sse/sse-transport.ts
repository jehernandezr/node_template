import type { IncomingMessage, ServerResponse } from 'node:http';
import { AuthenticationError } from '@platform/auth';
import { StreamAuthenticator } from '../auth/stream-authenticator.js';
import type { RealtimeHost } from '../realtime-host.js';
import { RealtimeTransport } from '../realtime-transport.js';
import { RealtimeConnections } from '../session/realtime-connections.js';
import { SseResponseSink } from './sse-response-sink.js';

/**
 * `GET <path>` como `text/event-stream`. Reanuda desde `Last-Event-ID`, que el navegador manda solo al
 * reconectar, así una conexión cortada no pierde tramas mientras sigan retenidas en el stream.
 */
export class SseTransport extends RealtimeTransport {
  private static readonly UNAUTHORIZED = 401;

  constructor(
    private readonly connections: RealtimeConnections,
    private readonly authenticator: StreamAuthenticator,
    private readonly path: string,
  ) {
    super();
  }

  attach(host: RealtimeHost): void {
    host.get(this.path, (request, response) => {
      this.serve(request, response).catch((error: unknown) =>
        response.destroy(error instanceof Error ? error : undefined),
      );
    });
  }

  close(): Promise<void> {
    return this.connections.closeAll();
  }

  private async serve(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const principal = await this.authenticator
      .authenticate({
        authorization: request.headers.authorization,
        cookie: request.headers.cookie,
      })
      .catch((error: unknown) => SseTransport.rejected(response, error));
    if (principal === undefined) {
      return;
    }
    const lastEventId = request.headers['last-event-id'];
    const connection = await this.connections.connect(
      principal,
      new SseResponseSink(response),
      typeof lastEventId === 'string' ? lastEventId : undefined,
    );
    // Un cliente que cortó durante la puesta al día ya no emitirá `close`.
    if (response.closed) {
      await connection.close();
      return;
    }
    response.on('close', () => void connection.close());
  }

  /** Un fallo que no es de autenticación es un error del servidor y sigue su camino. */
  private static rejected(response: ServerResponse, error: unknown): undefined {
    if (!(error instanceof AuthenticationError)) {
      throw error;
    }
    response.writeHead(SseTransport.UNAUTHORIZED, {
      'Content-Type': 'application/problem+json',
      'Cache-Control': 'no-store',
    });
    response.end(
      JSON.stringify({
        title: 'Unauthenticated',
        status: SseTransport.UNAUTHORIZED,
        code: error.code,
      }),
    );
    return undefined;
  }
}
