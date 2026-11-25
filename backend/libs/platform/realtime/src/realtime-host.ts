import type { IncomingMessage, Server, ServerResponse } from 'node:http';

export type StreamRequestHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => void;

/** The HTTP server where the transports are mounted and how to register a `GET` route on it. */
export interface RealtimeHost {
  readonly server: Server;
  get(path: string, handler: StreamRequestHandler): void;
}
