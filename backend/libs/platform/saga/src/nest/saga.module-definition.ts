import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import type { SagaModuleOptions } from './saga-module-options.js';

/** Opciones de `SagaModule.forRootAsync`, sin los adaptadores. */
export type SagaModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<SagaModuleOptions>;

export const {
  ConfigurableModuleClass: SagaModuleClass,
  MODULE_OPTIONS_TOKEN: SAGA_MODULE_OPTIONS,
} = new ConfigurableModuleBuilder<SagaModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
