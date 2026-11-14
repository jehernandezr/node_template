import { ConfigurableModuleBuilder } from '@nestjs/common';
import { ResilienceRegistry } from '../resilience-registry.js';
import type {
  ResilienceModuleExtras,
  ResilienceModuleOptions,
} from './resilience-module-options.js';
import { ResilienceProviders } from './resilience.providers.js';
import { RESILIENCE_OPTIONS } from './resilience-tokens.js';

export const { ConfigurableModuleClass: ResilienceConfigurableModule } =
  new ConfigurableModuleBuilder<ResilienceModuleOptions>({
    optionsInjectionToken: RESILIENCE_OPTIONS,
  })
    .setClassMethodName('forRoot')
    .setExtras<ResilienceModuleExtras>(
      { isGlobal: true },
      (definition, extras) => ({
        ...definition,
        global: extras.isGlobal,
        providers: [
          ...(definition.providers ?? []),
          ...ResilienceProviders.build(extras),
        ],
        exports: [ResilienceRegistry],
      }),
    )
    .build();
