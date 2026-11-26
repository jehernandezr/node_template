import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';

/** A request the local API received. */
export interface ReceivedRequest {
  readonly method: string;
  readonly url: string;
  readonly headers: IncomingMessage['headers'];
  readonly body: string;
}

/** Writes the answer to one request. */
export type LocalHandler = (
  request: ReceivedRequest,
  response: ServerResponse,
) => void;

/** An HTTP server on a free local port that records each request and answers with the handler of the test. */
export class LocalApi {
  readonly received: ReceivedRequest[] = [];
  private readonly server: Server;

  constructor(private handler: LocalHandler) {
    this.server = createServer((request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        const received = {
          method: request.method ?? '',
          url: request.url ?? '',
          headers: request.headers,
          body: Buffer.concat(chunks).toString(),
        };
        this.received.push(received);
        this.handler(received, response);
      });
    });
  }

  /** Starts listening and returns the base URL. */
  async start(): Promise<URL> {
    await new Promise<void>((resolve) =>
      this.server.listen(0, '127.0.0.1', resolve),
    );
    const { port } = this.server.address() as AddressInfo;
    return new URL(`http://127.0.0.1:${port}`);
  }

  /** Replaces the handler for the next requests. */
  answer(handler: LocalHandler): void {
    this.handler = handler;
  }

  /** Closes the server and every open connection. */
  async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}
