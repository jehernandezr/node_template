import type { INestApplication } from '@nestjs/common';
import { HttpApplicationConfigurer } from '../../http-application-configurer.js';
import { BootstrapStep } from './bootstrap-step.enum.js';

/** Configurador que anota en `steps` cuándo se ejecuta, para verificar el orden del arranque. */
export class RecordingHttpConfigurer extends HttpApplicationConfigurer {
  constructor(private readonly steps: BootstrapStep[]) {
    super();
  }

  configure(app: INestApplication): void {
    void app;
    this.steps.push(BootstrapStep.Configure);
  }
}
