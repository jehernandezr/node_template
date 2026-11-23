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
 * Monta los transportes al iniciar los módulos: el servidor HTTP ya existe y Nest todavía no registró su
 * respuesta 404, que taparía la ruta SSE si se agregara después. Cierra las conexiones antes de que Nest
 * cierre el servidor. En un worker no hay servidor y no se monta nada.
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
