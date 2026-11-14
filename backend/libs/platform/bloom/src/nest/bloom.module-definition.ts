import { ConfigurableModuleBuilder } from '@nestjs/common';
import { BLOOM_OPTIONS } from './bloom-tokens.js';
import { BloomProviders } from './bloom.providers.js';
import type {
  BloomModuleExtras,
  BloomModuleOptions,
} from './bloom-module-options.js';

export const { ConfigurableModuleClass: BloomConfigurableModule } =
  new ConfigurableModuleBuilder<BloomModuleOptions>({
    optionsInjectionToken: BLOOM_OPTIONS,
  })
    .setClassMethodName('forRoot')
    .setExtras<BloomModuleExtras>({ isGlobal: true }, (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
      providers: [
        ...(definition.providers ?? []),
        ...BloomProviders.build(extras),
      ],
      exports: BloomProviders.exports(),
    }))
    .build();
