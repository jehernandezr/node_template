import type { DynamicModule, NestApplicationOptions } from '@nestjs/common';
import type { ServiceDefinition } from '../../service-definition.js';
import { ServiceDefinitionValidator } from '../../service-definition-validator.js';
import { ServiceHostModule } from '../runtime/service-host.module.js';
import { NestServiceApplicationFactory } from './nest-service-application-factory.js';
import { RunningService, type ServiceAddress } from './running-service.js';
import type { ServiceApplicationFactory } from './service-application-factory.js';
import type { ServiceBootstrapOptions } from './service-bootstrap-options.js';

/** Startup of a service process. `main.ts` calls `http`; `worker.ts` calls `worker`. */
export class ServiceBootstrap {
  private static readonly DEFAULT_PORT = 3000;
  private static readonly DEFAULT_HOST = '0.0.0.0';
  private static readonly DEFAULT_GRACE_MS = 10_000;
  private static readonly NEST_OPTIONS: NestApplicationOptions = {
    abortOnError: false,
    logger: ['error', 'warn'],
  };

  /**
   * Process with an HTTP server: creates the application with `ServiceHostModule`, enables the shutdown hooks and listens.
   * @param definition Service definition.
   * @param options HTTP and shutdown options.
   * @returns The running service.
   */
  static async http(
    definition: ServiceDefinition,
    options: ServiceBootstrapOptions = {},
  ): Promise<RunningService> {
    const host = ServiceBootstrap.host(definition, options);
    const app = await ServiceBootstrap.applications(options).http(
      host,
      options.http?.adapter,
      ServiceBootstrap.NEST_OPTIONS,
    );
    await options.http?.configurer?.configure(app);
    app.enableShutdownHooks();
    await app.listen(
      options.http?.port ?? ServiceBootstrap.DEFAULT_PORT,
      options.http?.host ?? ServiceBootstrap.DEFAULT_HOST,
    );
    return new RunningService(
      definition.name,
      app,
      options.shutdownGraceMs ?? ServiceBootstrap.DEFAULT_GRACE_MS,
      ServiceBootstrap.addressOf(app.getHttpServer()),
    );
  }

  /**
   * Process without an HTTP server: jobs and consumers.
   * @param definition Service definition.
   * @param options Shutdown options.
   * @returns The running service.
   */
  static async worker(
    definition: ServiceDefinition,
    options: ServiceBootstrapOptions = {},
  ): Promise<RunningService> {
    const app = await ServiceBootstrap.applications(options).worker(
      ServiceBootstrap.host(definition, options),
      ServiceBootstrap.NEST_OPTIONS,
    );
    app.enableShutdownHooks();
    return new RunningService(
      definition.name,
      app,
      options.shutdownGraceMs ?? ServiceBootstrap.DEFAULT_GRACE_MS,
    );
  }

  private static applications(
    options: ServiceBootstrapOptions,
  ): ServiceApplicationFactory {
    return options.applications ?? new NestServiceApplicationFactory();
  }

  private static host(
    definition: ServiceDefinition,
    options: ServiceBootstrapOptions,
  ): DynamicModule {
    new ServiceDefinitionValidator().validate(definition);
    return ServiceHostModule.forService(definition, {
      env: options.env ?? process.env,
      ...(options.telemetry === undefined
        ? {}
        : { telemetry: options.telemetry }),
      ...(options.adapters === undefined ? {} : { adapters: options.adapters }),
      ...(options.publisher === undefined
        ? {}
        : { publisher: options.publisher }),
      ...(options.schedulingMode === undefined
        ? {}
        : { schedulingMode: options.schedulingMode }),
      ...(options.overrides === undefined
        ? {}
        : { overrides: options.overrides }),
    });
  }

  private static addressOf(server: unknown): ServiceAddress | undefined {
    if (!ServiceBootstrap.isAddressable(server)) {
      return undefined;
    }
    const address = server.address();
    if (typeof address !== 'object' || address === null) {
      return undefined;
    }
    if (
      'address' in address &&
      'port' in address &&
      typeof address.address === 'string' &&
      typeof address.port === 'number'
    ) {
      return { host: address.address, port: address.port };
    }
    return undefined;
  }

  private static isAddressable(
    server: unknown,
  ): server is { address(): unknown } {
    return (
      typeof server === 'object' &&
      server !== null &&
      'address' in server &&
      typeof server.address === 'function'
    );
  }
}
