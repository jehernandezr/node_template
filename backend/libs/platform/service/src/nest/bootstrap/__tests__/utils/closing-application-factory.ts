import type {
  DynamicModule,
  INestApplication,
  NestApplicationOptions,
} from '@nestjs/common';
import type { AbstractHttpAdapter } from '@nestjs/core';
import { NestServiceApplicationFactory } from '../../nest-service-application-factory.js';

/**
 * The application factory the services use, keeping each HTTP application it creates so a test can close them: a
 * Lambda handler never stops the service it started.
 */
export class ClosingApplicationFactory extends NestServiceApplicationFactory {
  private readonly created: INestApplication[] = [];

  override async http(
    module: DynamicModule,
    adapter: AbstractHttpAdapter | undefined,
    options: NestApplicationOptions,
  ): Promise<INestApplication> {
    const app = await super.http(module, adapter, options);
    this.created.push(app);
    return app;
  }

  /** Closes every application created so far. */
  async closeAll(): Promise<void> {
    await Promise.all(this.created.splice(0).map((app) => app.close()));
  }
}
