import { Module, type DynamicModule } from '@nestjs/common';
import type {
  ValkeyModuleExtras,
  ValkeyModuleOptions,
} from './valkey-module-options.js';
import {
  ValkeyModuleClass,
  type ValkeyModuleAsyncOptions,
} from './valkey.module-definition.js';

/**
 * Wiring of the Valkey adapter: client, command executor, key
 * namespace and the cache, rate-limit, routing cache, directory change
 * channel, Bloom filter and job lock adapters, plus its health
 * indicator. It is global and closes the client with `quit` in its `onModuleDestroy`:
 * Nest destroys global modules last and in reverse import
 * order, so the jobs and consumers that use Valkey have already stopped.
 */
@Module({})
export class ValkeyModule extends ValkeyModuleClass {
  static override forRoot(
    options: ValkeyModuleOptions & Partial<ValkeyModuleExtras> = {},
  ): DynamicModule {
    return super.forRoot(options);
  }

  static override forRootAsync(
    options: ValkeyModuleAsyncOptions & Partial<ValkeyModuleExtras>,
  ): DynamicModule {
    return super.forRootAsync(options);
  }
}
