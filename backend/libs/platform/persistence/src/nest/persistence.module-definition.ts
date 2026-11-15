import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import type { PersistenceModuleOptions } from '../model/persistence-module-options.js';

/** Opciones de `PersistenceModule.forRootAsync`, sin los adaptadores. */
export type PersistenceModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<PersistenceModuleOptions>;

export const {
  ConfigurableModuleClass: PersistenceModuleClass,
  MODULE_OPTIONS_TOKEN: PERSISTENCE_OPTIONS,
} = new ConfigurableModuleBuilder<PersistenceModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
