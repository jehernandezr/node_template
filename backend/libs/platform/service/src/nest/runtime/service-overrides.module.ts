import { Module, type DynamicModule, type Provider } from '@nestjs/common';

/**
 * Supplies process providers in a global module, so the business code injects them without
 * importing this module. It is internal: the service passes its substitutes through `ServiceHostOptions`.
 */
@Module({})
export class ServiceOverridesModule {
  static of(providers: readonly Provider[]): DynamicModule {
    return {
      module: ServiceOverridesModule,
      global: true,
      providers: [...providers],
      exports: [...providers],
    };
  }
}
