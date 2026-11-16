import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import type { SchedulingModuleOptions } from './scheduling-module-options.js';

/** Opciones de `SchedulingModule.forRootAsync`, sin los adaptadores. */
export type SchedulingModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<SchedulingModuleOptions>;

export const {
  ConfigurableModuleClass: SchedulingModuleClass,
  MODULE_OPTIONS_TOKEN: SCHEDULING_OPTIONS,
} = new ConfigurableModuleBuilder<SchedulingModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
