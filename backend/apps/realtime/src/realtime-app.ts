import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import type { ConfigEnv } from '@platform/config';
import { realtimeAppConfigSchema } from './config/realtime-app.config.js';
import { RealtimeAppModule } from './realtime-app.module.js';

/** Arranca `apps/realtime` escuchando en `PORT` y devuelve la app para cerrarla. */
export class RealtimeApp {
  static async start(env: ConfigEnv, host?: string): Promise<INestApplication> {
    const app = await NestFactory.create(RealtimeAppModule.forEnv(env), {
      abortOnError: false,
    });
    app.enableShutdownHooks();
    const port = realtimeAppConfigSchema.shape.PORT.parse(env['PORT']);
    await (host === undefined ? app.listen(port) : app.listen(port, host));
    return app;
  }
}
