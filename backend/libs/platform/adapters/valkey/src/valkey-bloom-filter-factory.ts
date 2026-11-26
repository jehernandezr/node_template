import {
  BloomFilterFactory,
  type RebuildableBloomFilter,
  type ResolvedBloomFilterDefinition,
} from '@platform/bloom';
import type { IdGenerator } from '@platform/kernel';
import { ValkeyBloomFilter } from './valkey-bloom-filter.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';

/** Creates the `ValkeyBloomFilter` of each definition. `BloomModule` receives it as `factory`. */
export class ValkeyBloomFilterFactory extends BloomFilterFactory {
  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  override create(
    definition: ResolvedBloomFilterDefinition,
  ): RebuildableBloomFilter {
    return new ValkeyBloomFilter(this.executor, {
      name: definition.name,
      expectedItems: definition.expectedItems,
      falsePositiveRate: definition.falsePositiveRate,
      keyspace: this.keyspace,
      ids: this.ids,
    });
  }
}
