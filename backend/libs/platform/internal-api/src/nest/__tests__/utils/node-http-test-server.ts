import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { HttpException } from '@nestjs/common';
import type { InternalApiController } from '../../internal-api.controller.js';
import { InternalApiRoute } from '../../../transport/internal-api-route.js';

/** Servidor `node:http` real que entrega las peticiones HTTP al controller de la API interna. */
export class NodeHttpTestServer {
  private server: Server | undefined;

  constructor(private readonly controller: InternalApiController) {}

  /** Escucha en un puerto libre de `127.0.0.1` y resuelve la URL base. */
  start(): Promise<string> {
    const server = createServer((request, response) => {
      void this.handle(request, response);
    });
    this.server = server;
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address === null || typeof address === 'string') {
          reject(new Error('The test server has no TCP address'));
          return;
        }
        resolve(`http://127.0.0.1:${address.port}`);
      });
    });
  }

  /** Corta las conexiones abiertas y cierra el servidor. */
  stop(): Promise<void> {
    const server = this.server;
    if (server === undefined) {
      return Promise.resolve();
    }
    server.closeAllConnections();
    return new Promise((resolve, reject) => {
      server.close((error) =>
        error === undefined ? resolve() : reject(error),
      );
    });
  }

  private async handle(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const prefix = `/${InternalApiRoute.BASE}/`;
    const url = request.url ?? '';
    if (request.method !== 'POST' || !url.startsWith(prefix)) {
      response.writeHead(404).end();
      return;
    }
    const text = await NodeHttpTestServer.readText(request);
    const body = NodeHttpTestServer.parse(text);
    if (body === undefined) {
      response.writeHead(400).end();
      return;
    }
    const operationId = decodeURIComponent(
      url.slice(prefix.length).split('?')[0] ?? '',
    );
    try {
      const result = await this.controller.handle(
        operationId,
        body,
        request.headers,
      );
      response
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify(result));
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : 500;
      response.writeHead(status).end();
    }
  }

  private static readText(request: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      request.on('error', reject);
    });
  }

  /** Cuerpo JSON, o `undefined` si el texto no es JSON. */
  private static parse(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
}
