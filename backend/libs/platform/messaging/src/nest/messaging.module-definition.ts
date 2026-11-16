import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import type { MessagingModuleOptions } from './messaging-module-options.js';

/** Opciones de `MessagingModule.forRootAsync`, sin los adaptadores. */
export type MessagingModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<MessagingModuleOptions>;

export const {
  ConfigurableModuleClass: MessagingModuleClass,
  MODULE_OPTIONS_TOKEN: MESSAGING_MODULE_OPTIONS,
} = new ConfigurableModuleBuilder<MessagingModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
