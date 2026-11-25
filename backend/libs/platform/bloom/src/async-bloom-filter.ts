/** Bloom filter port for remote backends (for example, Valkey). */
export abstract class AsyncBloomFilter {
  /** Inserts an item. */
  abstract add(item: string): Promise<void>;
  /** Inserts several items. */
  abstract addMany(items: readonly string[]): Promise<void>;
  /** Resolves false when the item is definitely absent; true when it might be present. */
  abstract mightContain(item: string): Promise<boolean>;
}
