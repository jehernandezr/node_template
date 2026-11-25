import {
  Injectable,
  type BeforeApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { RealtimeTransport } from '../realtime-transport.js';
import { NestRealtimeHost } from './nest-realtime-host.js';
import { RealtimeTransports } from './realtime-transports.js';

/**
 * Mounts the transports when the modules initialize: the HTTP server already exists and Nest has not yet registered its
 * 404 response, which would hide the SSE route if it were added later. Closes the connections before Nest
 * closes the server. In a worker there is no server and nothing is mounted.
 */
@Injectable()
export class RealtimeLifecycle
  implements OnModuleInit, BeforeApplicationShutdown
{
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly transports: RealtimeTransports,
  ) {}

  onModuleInit(): void {
    if (this.adapterHost.httpAdapter === undefined) {
      return;
    }
    const host = new NestRealtimeHost(this.adapterHost);
    this.transports.all.forEach((transport: RealtimeTransport) =>
      transport.attach(host),
    );
  }

  async beforeApplicationShutdown(): Promise<void> {
    await Promise.all(this.transports.all.map((t) => t.close()));
  }
}
