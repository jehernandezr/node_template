import type { Server } from 'node:http';
import type { HttpAdapterHost } from '@nestjs/core';
import type { RealtimeHost, StreamRequestHandler } from '../realtime-host.js';

/** El servidor HTTP de la app de Nest como anfitrión de los transportes. */
export class NestRealtimeHost implements RealtimeHost {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  get server(): Server {
    return this.adapterHost.httpAdapter.getHttpServer() as Server;
  }

  get(path: string, handler: StreamRequestHandler): void {
    this.adapterHost.httpAdapter.get(path, handler);
  }
}
