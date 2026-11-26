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

/** NestJS resilience module: provides one `ResilienceRegistry` per application. */
@Module({})
export class ResilienceModule extends ResilienceConfigurableModule {
  static override forRoot(
    options: ResilienceModuleOptions & Partial<ResilienceModuleExtras> = {},
  ): DynamicModule {
    return super.forRoot(options);
  }

  /**
   * Registers a service's policy. Registration happens when the
   * module is created, so a misconfigured policy fails at startup.
   * @param feature Policy name and configuration.
   * @returns The module.
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
