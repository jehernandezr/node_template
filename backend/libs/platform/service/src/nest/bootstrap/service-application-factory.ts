import type {
  DynamicModule,
  INestApplication,
  INestApplicationContext,
  NestApplicationOptions,
} from '@nestjs/common';
import type { AbstractHttpAdapter } from '@nestjs/core';

/** Creates the Nest application a service process runs: with an HTTP server or without one. */
export abstract class ServiceApplicationFactory {
  /**
   * Creates the application of a process that serves HTTP; the caller configures it and makes it listen.
   * @param module Root module of the service host.
   * @param adapter HTTP adapter; Nest loads `@nestjs/platform-express` when absent.
   * @param options Nest options of the application.
   * @returns The application, not yet listening.
   */
  abstract http(
    module: DynamicModule,
    adapter: AbstractHttpAdapter | undefined,
    options: NestApplicationOptions,
  ): Promise<INestApplication>;

  /**
   * Creates the context of a process without HTTP, which runs jobs and consumers.
   * @param module Root module of the service host.
   * @param options Nest options of the context.
   * @returns The initialized context.
   */
  abstract worker(
    module: DynamicModule,
    options: NestApplicationOptions,
  ): Promise<INestApplicationContext>;
}
