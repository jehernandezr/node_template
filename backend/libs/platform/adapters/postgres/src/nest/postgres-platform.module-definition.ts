import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import type { PostgresPlatformModuleOptions } from '../model/postgres-platform-module-options.js';

/** Opciones de `PostgresPlatformModule.forRootAsync`. */
export type PostgresPlatformModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<PostgresPlatformModuleOptions>;

export const {
  ConfigurableModuleClass: PostgresPlatformModuleClass,
  MODULE_OPTIONS_TOKEN: POSTGRES_PLATFORM_OPTIONS,
} = new ConfigurableModuleBuilder<PostgresPlatformModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
