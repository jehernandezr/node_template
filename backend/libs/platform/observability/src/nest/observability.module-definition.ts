import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { ObservabilityModuleOptions } from './observability-module-options.js';

export const {
  ConfigurableModuleClass: ObservabilityModuleClass,
  MODULE_OPTIONS_TOKEN: OBSERVABILITY_OPTIONS,
} = new ConfigurableModuleBuilder<ObservabilityModuleOptions>()
  .setClassMethodName('forRoot')
  .build();
