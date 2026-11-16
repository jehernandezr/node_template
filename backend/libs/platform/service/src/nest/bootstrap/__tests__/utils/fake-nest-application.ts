import type { INestApplication } from '@nestjs/common';
import { BootstrapStep } from './bootstrap-step.enum.js';

/** Dirección en la que se pidió escuchar a `FakeNestApplication`. */
export interface ListenRequest {
  readonly port: number | string;
  readonly host: string | undefined;
}

/**
 * Doble parcial de la aplicación HTTP de Nest: anota en `steps` el orden del arranque y en `listened`
 * dónde se pidió escuchar. Sin adaptador real, `NestFactory.create` no puede crear una aplicación
 * completa en las pruebas.
 */
export class FakeNestApplication {
  readonly listened: ListenRequest[] = [];

  constructor(
    private readonly steps: BootstrapStep[],
    private readonly server: unknown,
  ) {}

  enableShutdownHooks(): this {
    this.steps.push(BootstrapStep.EnableShutdownHooks);
    return this;
  }

  listen(port: number | string, host?: string): Promise<void> {
    this.steps.push(BootstrapStep.Listen);
    this.listened.push({ port, host });
    return Promise.resolve();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  getHttpServer(): unknown {
    return this.server;
  }

  /** La forma que espera el código de arranque; el doble solo implementa lo que el arranque usa. */
  asNestApplication(): INestApplication {
    return this as unknown as INestApplication;
  }
}
