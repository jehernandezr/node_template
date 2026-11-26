import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@platform/config/nest';
import { FlagEvaluator } from '../flag-evaluator.js';
import { FlagStore } from '../flag-store.js';
import { FlagStoreSelector } from '../flag-store-selector.js';
import { FlagsConfig, type FlagsSettings } from '../flags.config.js';

/** `FlagStore` according to `FLAGS_STORE` and `FlagEvaluator`, global for the service. */
@Module({})
export class FlagsModule {
  /**
   * Registers the flag evaluator and its store.
   * @returns The global module.
   */
  static forRoot(): DynamicModule {
    return {
      module: FlagsModule,
      global: true,
      imports: [ConfigModule.forFeature(FlagsConfig)],
      providers: [
        {
          provide: FlagStore,
          useFactory: (settings: FlagsSettings) =>
            new FlagStoreSelector().select(settings),
          inject: [FlagsConfig.token],
        },
        {
          provide: FlagEvaluator,
          useFactory: (store: FlagStore) => new FlagEvaluator(store),
          inject: [FlagStore],
        },
      ],
      exports: [FlagStore, FlagEvaluator],
    };
  }
}
