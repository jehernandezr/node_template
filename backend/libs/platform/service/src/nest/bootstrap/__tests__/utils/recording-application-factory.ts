import type {
  DynamicModule,
  INestApplication,
  INestApplicationContext,
} from '@nestjs/common';
import type { AbstractHttpAdapter } from '@nestjs/core';
import { ServiceApplicationFactory } from '../../service-application-factory.js';
import type { FakeNestApplication } from './fake-nest-application.js';

/** What `RecordingApplicationFactory` was asked to create. */
export interface ApplicationRequest {
  readonly module: DynamicModule;
  readonly adapter?: AbstractHttpAdapter;
}

/**
 * Hands out a fake application instead of starting Nest, and records each module and adapter it was given. A queued
 * failure makes the next request reject, as a start that cannot reach its database would.
 */
export class RecordingApplicationFactory extends ServiceApplicationFactory {
  readonly requests: ApplicationRequest[] = [];
  private readonly failures: Error[] = [];

  constructor(private readonly app: FakeNestApplication) {
    super();
  }

  /**
   * Makes the next request fail with the error.
   * @param error What the request rejects with.
   * @returns This factory, to chain.
   */
  failNext(error: Error): this {
    this.failures.push(error);
    return this;
  }

  override async http(
    module: DynamicModule,
    adapter: AbstractHttpAdapter | undefined,
  ): Promise<INestApplication> {
    this.requests.push(
      adapter === undefined ? { module } : { module, adapter },
    );
    const failure = this.failures.shift();
    if (failure !== undefined) {
      throw failure;
    }
    return this.app.asNestApplication();
  }

  override async worker(
    module: DynamicModule,
  ): Promise<INestApplicationContext> {
    this.requests.push({ module });
    return this.app.asNestApplication();
  }
}
