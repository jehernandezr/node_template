import { Module, type DynamicModule } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ResilienceModule } from '@platform/resilience/nest';
import { ExternalApiPolicy } from '../client/external-api-policy.js';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';
import { InternalApiController } from './internal-api.controller.js';
import {
  InternalApiModuleClass,
  type InternalApiModuleAsyncOptions,
} from './internal-api.module-definition.js';
import { InternalApiProviders } from './internal-api.providers.js';
import type {
  InternalApiModuleExtras,
  InternalApiModuleOptions,
} from './internal-api-module-options.js';
import { InternalTransportKind } from './internal-transport-kind.enum.js';

/**
 * Wiring of the internal API: client, router, transport, incoming
 * controller and jobs. The service chooses the transport and the idempotency store
 * when composing the module. It requires a `ResilienceModule.forRoot`, the
 * observability module and, to run retention, a `SchedulingModule`.
 *
 * On startup, `InternalHandlerExplorer` registers the decorated handlers and
 * checks that none is missing.
 */
@Module({})
export class InternalApiModule extends InternalApiModuleClass {
  static override forRoot(
    options: InternalApiModuleOptions & InternalApiModuleExtras,
  ): DynamicModule {
    return InternalApiModule.complete(super.forRoot(options), options);
  }

  static override forRootAsync(
    options: InternalApiModuleAsyncOptions & InternalApiModuleExtras,
  ): DynamicModule {
    return InternalApiModule.complete(super.forRootAsync(options), options);
  }

  /** @throws InternalApiError `InvalidConfiguration` if the transport or the idempotency store is missing. */
  private static complete(
    base: DynamicModule,
    extras: InternalApiModuleExtras,
  ): DynamicModule {
    const { transport, processedStore } = extras;
    if (
      transport === undefined ||
      !Object.values(InternalTransportKind).includes(transport) ||
      typeof processedStore !== 'function'
    ) {
      throw new InternalApiError(
        InternalApiErrorCode.InvalidConfiguration,
        'InternalApiModule needs a transport and a processedStore',
      );
    }
    return {
      ...base,
      global: extras.isGlobal ?? true,
      imports: [
        ...(base.imports ?? []),
        DiscoveryModule,
        ResilienceModule.forFeature({
          name: ExternalApiPolicy.NAME,
          policy: ExternalApiPolicy.CONFIG,
        }),
      ],
      controllers: [InternalApiController],
      providers: [
        ...(base.providers ?? []),
        ...InternalApiProviders.build({ ...extras, transport, processedStore }),
      ],
      exports: InternalApiProviders.exports(),
    };
  }
}
