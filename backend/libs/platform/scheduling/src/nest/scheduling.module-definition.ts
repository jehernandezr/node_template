import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import type { SchedulingModuleOptions } from './scheduling-module-options.js';

/** Options of `SchedulingModule.forRootAsync`, without the adapters. */
export type SchedulingModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<SchedulingModuleOptions>;

export const {
  ConfigurableModuleClass: SchedulingModuleClass,
  MODULE_OPTIONS_TOKEN: SCHEDULING_OPTIONS,
} = new ConfigurableModuleBuilder<SchedulingModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
