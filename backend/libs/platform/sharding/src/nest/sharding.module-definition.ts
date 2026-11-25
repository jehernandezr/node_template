import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import type { ShardingModuleOptions } from './sharding-module-options.js';

/** Options of `ShardingModule.forRootAsync`, without the adapters. */
export type ShardingModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<ShardingModuleOptions>;

export const {
  ConfigurableModuleClass: ShardingModuleClass,
  MODULE_OPTIONS_TOKEN: SHARDING_OPTIONS,
} = new ConfigurableModuleBuilder<ShardingModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
