import { Module, type DynamicModule } from '@nestjs/common';
import type {
  RateLimitModuleExtras,
  RateLimitModuleOptions,
} from './rate-limit-module-options.js';
import { RateLimitConfigurableModule } from './rate-limit.module-definition.js';

/** Rate limit module: the limiter, the guard and the key resolver. */
@Module({})
export class RateLimitModule extends RateLimitConfigurableModule {
  static override forRoot(
    options: RateLimitModuleOptions & Partial<RateLimitModuleExtras> = {},
  ): DynamicModule {
    return super.forRoot(options);
  }
}
