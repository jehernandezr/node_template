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
 * Cableado de la API interna: cliente, router, transporte, controller de
 * entrada y jobs. El servicio elige el transporte y el almacén de idempotencia
 * al componer el módulo. Exige un `ResilienceModule.forRoot`, el módulo de
 * observabilidad y, para correr la retención, un `SchedulingModule`.
 *
 * Al arrancar, `InternalHandlerExplorer` registra los handlers decorados y
 * comprueba que no falte ninguno.
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

  /** @throws InternalApiError `InvalidConfiguration` si falta el transporte o el almacén de idempotencia. */
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
