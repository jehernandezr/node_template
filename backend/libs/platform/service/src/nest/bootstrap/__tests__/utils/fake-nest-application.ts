import type { INestApplication } from '@nestjs/common';
import { BootstrapStep } from './bootstrap-step.enum.js';

/** Address that `FakeNestApplication` was asked to listen on. */
export interface ListenRequest {
  readonly port: number | string;
  readonly host: string | undefined;
}

/**
 * Partial double of the Nest HTTP application: records in `steps` the startup order and in `listened`
 * where it was asked to listen. Without a real adapter, `NestFactory.create` cannot create a full
 * application in the tests.
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

  /** The shape the startup code expects; the double only implements what the startup uses. */
  asNestApplication(): INestApplication {
    return this as unknown as INestApplication;
  }
}
