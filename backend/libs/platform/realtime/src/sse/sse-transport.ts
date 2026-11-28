import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamAuthenticator } from '../auth/stream-authenticator.js';
import { StreamRejection } from '../auth/stream-rejection.js';
import type { RealtimeHost } from '../realtime-host.js';
import { RealtimeTransport } from '../realtime-transport.js';
import { RealtimeConnections } from '../session/realtime-connections.js';
import { SseResponseSink } from './sse-response-sink.js';

/**
 * `GET <path>` as `text/event-stream`. Resumes from `Last-Event-ID`, which the browser sends only when
 * reconnecting, so a dropped connection loses no frames as long as they are still retained in the stream.
 */
export class SseTransport extends RealtimeTransport {
  constructor(
    private readonly connections: RealtimeConnections,
    private readonly authenticator: StreamAuthenticator,
    private readonly path: string,
  ) {
    super();
  }

  override attach(host: RealtimeHost): void {
    host.get(this.path, (request, response) => {
      this.serve(request, response).catch((error: unknown) =>
        response.destroy(error instanceof Error ? error : undefined),
      );
    });
  }

  override close(): Promise<void> {
    return this.connections.closeAll();
  }

  /**
   * A client that disconnected during the catch-up will no longer emit `close`.
   */
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
    if (response.closed) {
      await connection.close();
      return;
    }
    response.on('close', () => void connection.close());
  }

  /**
   * An invalid credential answers 401; a revocation state that cannot be checked answers 503 with `Retry-After`, so
   * the client keeps its session. A failure that is not an authentication one is a server error and goes on its way.
   */
  private static rejected(response: ServerResponse, error: unknown): undefined {
    const rejection = StreamRejection.of(error);
    if (rejection === undefined) {
      throw error;
    }
    response.writeHead(rejection.status, {
      'Content-Type': 'application/problem+json',
      'Cache-Control': 'no-store',
      ...(rejection.retryable
        ? { 'Retry-After': String(StreamRejection.RETRY_AFTER_SECONDS) }
        : {}),
    });
    response.end(JSON.stringify(rejection.problem()));
    return undefined;
  }
}
