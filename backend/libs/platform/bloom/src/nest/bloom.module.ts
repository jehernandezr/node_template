import { Module, type DynamicModule } from '@nestjs/common';
import type { AsyncBloomFilter } from '../async-bloom-filter.js';
import { BloomDefinitionResolver } from '../bloom-definition-resolver.js';
import { BloomFilterAssembler } from '../bloom-filter-assembler.js';
import { BloomRebuildJob } from '../bloom-rebuild-job.js';
import type { BloomRebuildSourceProvider } from '../bloom-rebuild-source-provider.js';
import type { BloomFeatureOptions } from './bloom-module-options.js';
import { BloomConfigurableModule } from './bloom.module-definition.js';
import { BloomFeatureModule } from './bloom-feature.module.js';
import { bloomFilterToken, bloomRebuildJobToken } from './bloom-tokens.js';
import type {
  BloomModuleOptions,
  BloomModuleExtras,
} from './bloom-module-options.js';

/**
 * Application Bloom filters. `forRoot` registers the factory and the assembler (global by default);
 * `forFeature` declares a named filter, its source of truth and its rebuild job.
 */
@Module({})
export class BloomModule extends BloomConfigurableModule {
  static override forRoot(
    options: BloomModuleOptions & Partial<BloomModuleExtras> = {},
  ): DynamicModule {
    return super.forRoot(options);
  }

  /**
   * Returns a named filter and its job. The job stays as a provider so the `JobRunner` discovers it;
   * bloom does not import scheduling.
   * @param feature Filter definition and source.
   * @returns The module.
   * @throws InvalidParametersError when the definition is invalid.
   */
  static forFeature(feature: BloomFeatureOptions): DynamicModule {
    const resolved = BloomDefinitionResolver.resolve(feature.definition);
    const filterToken = bloomFilterToken(resolved.name);
    const jobToken = bloomRebuildJobToken(resolved.name);
    return {
      module: BloomFeatureModule,
      imports: feature.imports ?? [],
      providers: [
        feature.source,
        {
          provide: filterToken,
          useFactory: (assembler: BloomFilterAssembler) =>
            assembler.assemble(resolved),
          inject: [BloomFilterAssembler],
        },
        {
          provide: jobToken,
          useFactory: (
            filter: AsyncBloomFilter,
            source: BloomRebuildSourceProvider,
          ) => new BloomRebuildJob(resolved, filter, source),
          inject: [filterToken, feature.source],
        },
      ],
      exports: [filterToken, jobToken],
    };
  }
}
