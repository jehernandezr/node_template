import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import type { InternalApiModuleOptions } from './internal-api-module-options.js';

/** Options of `InternalApiModule.forRootAsync`, without the adapters. */
export type InternalApiModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<InternalApiModuleOptions>;

export const {
  ConfigurableModuleClass: InternalApiModuleClass,
  MODULE_OPTIONS_TOKEN: INTERNAL_API_OPTIONS,
} = new ConfigurableModuleBuilder<InternalApiModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
