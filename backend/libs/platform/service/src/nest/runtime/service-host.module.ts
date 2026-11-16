import { Module, type DynamicModule, type Type } from '@nestjs/common';
import type { ServiceDefinition } from '../../service-definition.js';
import { PlatformRuntimeModule } from './platform-runtime.module.js';
import { ServiceOverridesModule } from './service-overrides.module.js';
import type { ServiceHostOptions } from './service-host-options.js';

/** Módulo raíz de un proceso: el runtime de la plataforma, el módulo de negocio del servicio y los `overrides`. */
@Module({})
export class ServiceHostModule {
  static forService(
    definition: ServiceDefinition,
    options: ServiceHostOptions,
  ): DynamicModule {
    return {
      module: ServiceHostModule,
      imports: [
        PlatformRuntimeModule.forService(definition, options),
        ServiceOverridesModule.of(options.overrides ?? []),
        // El núcleo declara `rootModule` con un tipo propio para no importar NestJS. Aquí ya es una clase de módulo de Nest.
        definition.rootModule as unknown as Type<unknown>,
      ],
    };
  }
}
