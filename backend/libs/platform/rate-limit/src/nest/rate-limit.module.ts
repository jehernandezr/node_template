import { Module, type DynamicModule } from '@nestjs/common';
import type {
  RateLimitModuleExtras,
  RateLimitModuleOptions,
} from './rate-limit-module-options.js';
import { RateLimitConfigurableModule } from './rate-limit.module-definition.js';

/** Módulo de límite de tasa: el limitador, el guard y el resolutor de llaves. */
@Module({})
export class RateLimitModule extends RateLimitConfigurableModule {
  static override forRoot(
    options: RateLimitModuleOptions & Partial<RateLimitModuleExtras> = {},
  ): DynamicModule {
    return super.forRoot(options);
  }
}
