import { Module, type DynamicModule, type Provider } from '@nestjs/common';

/**
 * Entrega providers del proceso en un módulo global, para que el negocio los inyecte sin
 * importar este módulo. Es interno: el servicio pasa sus sustitutos por `ServiceHostOptions`.
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
