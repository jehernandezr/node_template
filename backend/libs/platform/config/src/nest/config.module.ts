import { Module, type DynamicModule } from '@nestjs/common';
import { AppConfig } from '../app-config.js';
import { ConfigLoader } from '../config-loader.js';
import type { ConfigEnv } from '../config-env.js';
import { ConfigRegistry } from '../config-registry.js';
import type { ConfigSection } from '../config-section.js';
import { RegistryAppConfig } from '../registry-app-config.js';
import type { ConfigModuleOptions } from './config-module-options.js';
import { CONFIG_ENV } from './config.tokens.js';

/**
 * Configuration. `forRoot` is global and provides `AppConfig`, `ConfigLoader` and
 * `ConfigRegistry`; `forFeature(section)` validates a section at startup. The
 * class has no `@Global()` so that each `forFeature` does not become global.
 */
@Module({})
export class ConfigModule {
  private static readonly EXPORTS = [AppConfig, ConfigLoader, ConfigRegistry];

  static forRoot(options: ConfigModuleOptions = {}): DynamicModule {
    return {
      module: ConfigModule,
      global: true,
      providers: [
        { provide: CONFIG_ENV, useValue: options.env ?? process.env },
        {
          provide: ConfigLoader,
          useFactory: (env: ConfigEnv) => new ConfigLoader(env),
          inject: [CONFIG_ENV],
        },
        { provide: ConfigRegistry, useFactory: () => new ConfigRegistry() },
        {
          provide: AppConfig,
          useFactory: (loader: ConfigLoader, registry: ConfigRegistry) => {
            if (options.schema !== undefined) {
              registry.setRoot(loader.load(options.schema));
            }
            return new RegistryAppConfig(loader, registry);
          },
          inject: [ConfigLoader, ConfigRegistry],
        },
      ],
      exports: ConfigModule.EXPORTS,
    };
  }

  /** Validates the section at startup and exposes it with its own token. */
  static forFeature<T>(section: ConfigSection<T>): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: section.token,
          useFactory: (config: AppConfig) => config.get(section),
          inject: [AppConfig],
        },
      ],
      exports: [section.token],
    };
  }
}
