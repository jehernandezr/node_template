import {
  ConfigurableModuleBuilder,
  type ConfigurableModuleAsyncOptions,
} from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { AuthConfig } from '../auth.config.js';
import type {
  AuthModuleExtras,
  AuthModuleOptions,
} from './auth-module-options.js';
import { AuthProviders } from './auth.providers.js';
import { AUTH_OPTIONS } from './auth.tokens.js';

/** Opciones de `AuthModule.forRootAsync`, sin los adaptadores. */
export type AuthModuleAsyncOptions =
  ConfigurableModuleAsyncOptions<AuthModuleOptions>;

export const { ConfigurableModuleClass: AuthModuleClass } =
  new ConfigurableModuleBuilder<AuthModuleOptions>({
    optionsInjectionToken: AUTH_OPTIONS,
  })
    .setClassMethodName('forRoot')
    .setExtras<Partial<AuthModuleExtras>>(
      {
        source: undefined,
        feed: undefined,
        accessGrants: undefined,
        apiKeyResolver: undefined,
        jwks: undefined,
      },
      (definition, extras) => {
        return {
          ...definition,
          global: true,
          imports: [
            ...(definition.imports ?? []),
            ConfigModule.forFeature(AuthConfig),
          ],
          providers: [
            ...(definition.providers ?? []),
            ...AuthProviders.build(extras),
          ],
          exports: AuthProviders.exports(),
        };
      },
    )
    .build();
