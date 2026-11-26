/** Bloom filter port for remote backends (for example, Valkey). */
export abstract class AsyncBloomFilter {
  /**
   * Inserts an item.
   * @param item Item to insert.
   */
  abstract add(item: string): Promise<void>;
  /**
   * Inserts several items.
   * @param items Items to insert.
   */
  abstract addMany(items: readonly string[]): Promise<void>;
  /**
   * Resolves false when the item is definitely absent; true when it might be present.
   * @param item Item to check.
   * @returns Whether it might be present.
   */
  abstract mightContain(item: string): Promise<boolean>;
}
