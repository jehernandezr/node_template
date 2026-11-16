import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { ServiceConfig } from '@platform/config';
import { ValkeyConfig } from '../valkey.config.js';
import type {
  ValkeyModuleExtras,
  ValkeyModuleOptions,
} from './valkey-module-options.js';
import { ValkeyProviders } from './valkey.providers.js';
import { VALKEY_MODULE_OPTIONS } from './valkey.tokens.js';

/** Opciones de `ValkeyModule.forRootAsync`, sin los adaptadores. */
export type ValkeyModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<ValkeyModuleOptions>;

export const { ConfigurableModuleClass: ValkeyModuleClass } =
  new ConfigurableModuleBuilder<ValkeyModuleOptions>({
    optionsInjectionToken: VALKEY_MODULE_OPTIONS,
  })
    .setClassMethodName('forRoot')
    .setExtras<ValkeyModuleExtras>(
      { authToken: undefined },
      (definition, extras) => ({
        ...definition,
        global: true,
        imports: [
          ...(definition.imports ?? []),
          ConfigModule.forFeature(ValkeyConfig),
          ConfigModule.forFeature(ServiceConfig),
        ],
        providers: [
          ...(definition.providers ?? []),
          ...ValkeyProviders.build(extras),
        ],
        exports: ValkeyProviders.exports(),
      }),
    )
    .build();
