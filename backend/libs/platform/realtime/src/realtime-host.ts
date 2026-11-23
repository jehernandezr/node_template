import type { IncomingMessage, Server, ServerResponse } from 'node:http';

export type StreamRequestHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => void;

/** El servidor HTTP donde se montan los transportes y cómo registrar una ruta `GET` en él. */
export interface RealtimeHost {
  readonly server: Server;
  get(path: string, handler: StreamRequestHandler): void;
}
