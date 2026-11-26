import { Module, type DynamicModule, type Type } from '@nestjs/common';
import type { ServiceDefinition } from '../../service-definition.js';
import { PlatformRuntimeModule } from './platform-runtime.module.js';
import { ServiceOverridesModule } from './service-overrides.module.js';
import type { ServiceHostOptions } from './service-host-options.js';

/** Root module of a process: the platform runtime, the service business module and the `overrides`. */
@Module({})
export class ServiceHostModule {
  /**
   * The core declares `rootModule` with its own type to avoid importing NestJS. Here it is already a Nest module class.
   */
  static forService(
    definition: ServiceDefinition,
    options: ServiceHostOptions,
  ): DynamicModule {
    return {
      module: ServiceHostModule,
      imports: [
        PlatformRuntimeModule.forService(definition, options),
        ServiceOverridesModule.of(options.overrides ?? []),
        definition.rootModule as unknown as Type<unknown>,
      ],
    };
  }
}
