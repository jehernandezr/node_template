import type { INestApplication } from '@nestjs/common';
import { HttpApplicationConfigurer } from '../../http-application-configurer.js';
import { BootstrapStep } from './bootstrap-step.enum.js';

/** Configurator that records in `steps` when it runs, to verify the startup order. */
export class RecordingHttpConfigurer extends HttpApplicationConfigurer {
  constructor(private readonly steps: BootstrapStep[]) {
    super();
  }

  configure(app: INestApplication): void {
    void app;
    this.steps.push(BootstrapStep.Configure);
  }
}
