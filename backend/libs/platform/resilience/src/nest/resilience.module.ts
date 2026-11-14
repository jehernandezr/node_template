import { Module, type DynamicModule } from '@nestjs/common';
import { ResilienceRegistry } from '../resilience-registry.js';
import {
  type ResilienceFeatureOptions,
  type ResilienceModuleExtras,
  type ResilienceModuleOptions,
} from './resilience-module-options.js';
import { ResilienceConfigurableModule } from './resilience.module-definition.js';
import { ResilienceFeatureModule } from './resilience-feature.module.js';
import { policyRegistrationToken } from './resilience-tokens.js';

/** Módulo de resiliencia de NestJS: entrega un `ResilienceRegistry` por aplicación. */
@Module({})
export class ResilienceModule extends ResilienceConfigurableModule {
  static override forRoot(
    options: ResilienceModuleOptions & Partial<ResilienceModuleExtras> = {},
  ): DynamicModule {
    return super.forRoot(options);
  }

  /**
   * Registra la política de un servicio. El registro se hace al crear el
   * módulo, así que una política mal configurada falla al arrancar.
   */
  static forFeature(feature: ResilienceFeatureOptions): DynamicModule {
    const token = policyRegistrationToken(feature.name);
    return {
      module: ResilienceFeatureModule,
      providers: [
        {
          provide: token,
          useFactory: (registry: ResilienceRegistry) => {
            registry.register(feature.name, feature.policy);
            return feature.name;
          },
          inject: [ResilienceRegistry],
        },
      ],
      exports: [token],
    };
  }
}
