import { ConfigurableModuleBuilder } from '@nestjs/common';
import { CACHE_OPTIONS } from './cache-tokens.js';
import { CacheProviders } from './cache.providers.js';
import type {
  CacheModuleExtras,
  CacheModuleOptions,
} from './cache-module-options.js';

export const { ConfigurableModuleClass: CacheConfigurableModule } =
  new ConfigurableModuleBuilder<CacheModuleOptions>({
    optionsInjectionToken: CACHE_OPTIONS,
  })
    .setClassMethodName('forRoot')
    .setExtras<CacheModuleExtras>({ isGlobal: true }, (definition, extras) => ({
      ...definition,
      global: extras.isGlobal,
      providers: [
        ...(definition.providers ?? []),
        ...CacheProviders.build(extras),
      ],
      exports: CacheProviders.exports(extras),
    }))
    .build();
