import { ConfigurableModuleBuilder } from '@nestjs/common';
import { RateLimiter } from '../rate-limiter.js';
import { RateLimitKeyResolver } from './rate-limit-key-resolver.js';
import type {
  RateLimitModuleExtras,
  RateLimitModuleOptions,
} from './rate-limit-module-options.js';
import { RATE_LIMIT_OPTIONS } from './rate-limit-tokens.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimitProviders } from './rate-limit.providers.js';

export const { ConfigurableModuleClass: RateLimitConfigurableModule } =
  new ConfigurableModuleBuilder<RateLimitModuleOptions>({
    optionsInjectionToken: RATE_LIMIT_OPTIONS,
  })
    .setClassMethodName('forRoot')
    .setExtras<RateLimitModuleExtras>(
      { isGlobal: true },
      (definition, extras) => ({
        ...definition,
        global: extras.isGlobal,
        providers: [
          ...(definition.providers ?? []),
          ...RateLimitProviders.build(extras),
        ],
        exports: [RateLimiter, RateLimitGuard, RateLimitKeyResolver],
      }),
    )
    .build();
