import type { Abstract, Provider, Type } from '@nestjs/common';
import { BloomFilterAssembler } from '../bloom-filter-assembler.js';
import { BloomFilterFactory } from '../bloom-filter-factory.js';
import { InMemoryBloomFilterFactory } from '../in-memory-bloom-filter-factory.js';
import { BLOOM_OPTIONS } from './bloom-tokens.js';
import type {
  BloomModuleExtras,
  BloomModuleOptions,
} from './bloom-module-options.js';

/** Providers of the bloom root module and those it exports. */
export class BloomProviders {
  static build(extras: BloomModuleExtras): Provider[] {
    return [
      {
        provide: InMemoryBloomFilterFactory,
        useFactory: () => new InMemoryBloomFilterFactory(),
      },
      {
        provide: BloomFilterFactory,
        useExisting: extras.factory ?? InMemoryBloomFilterFactory,
      },
      {
        provide: BloomFilterAssembler,
        useFactory: (
          factory: BloomFilterFactory,
          options: BloomModuleOptions,
        ) => new BloomFilterAssembler(factory, options.maxPartitionBits),
        inject: [BloomFilterFactory, BLOOM_OPTIONS],
      },
    ];
  }

  static exports(): Array<Abstract<unknown> | Type<unknown>> {
    return [BloomFilterAssembler, BloomFilterFactory];
  }
}
