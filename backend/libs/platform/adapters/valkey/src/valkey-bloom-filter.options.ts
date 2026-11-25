import type { IdGenerator } from '@platform/kernel';
import type { ValkeyKeyspace } from './valkey-keyspace.js';

/** Options of `ValkeyBloomFilter`. */
export interface ValkeyBloomFilterOptions {
  /** Filter name, usually a value of the caller's filter enum. */
  readonly name: string;
  readonly expectedItems: number;
  /** Defaults to `BloomSizing.DEFAULT_FALSE_POSITIVE_RATE` (1 %). */
  readonly falsePositiveRate?: number;
  /**
   * With `false` (the default) the module adds subfilters when the filter
   * grows beyond `expectedItems` and keeps the rate. With `true` the filter
   * refuses to grow beyond its capacity.
   */
  readonly nonScaling?: boolean;
  /** The filter lives at `<prefix>:bloom:{name}`, inside the ACL of the service user. */
  readonly keyspace: ValkeyKeyspace;
  /** Names the temporary keys of a rebuild. */
  readonly ids: IdGenerator;
}
