import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import type { ShardingModuleOptions } from './sharding-module-options.js';

/** Opciones de `ShardingModule.forRootAsync`, sin los adaptadores. */
export type ShardingModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<ShardingModuleOptions>;

export const {
  ConfigurableModuleClass: ShardingModuleClass,
  MODULE_OPTIONS_TOKEN: SHARDING_OPTIONS,
} = new ConfigurableModuleBuilder<ShardingModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
