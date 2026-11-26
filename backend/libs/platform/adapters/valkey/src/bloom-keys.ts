import { InvalidParametersError } from '@platform/bloom';
import type { IdGenerator } from '@platform/kernel';
import { LuaScript } from './lua-script.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';

/** Keys, batches and scripts of the Bloom filters in Valkey. */
export class BloomKeys {
  /** The longest a temporary rebuild key lives if its job dies halfway. */
  static readonly REBUILD_KEY_TTL_MS = 6 * 60 * 60 * 1_000;

  /** Items per command when adding many. */
  static readonly BATCH_SIZE = 1_000;

  private static readonly NAME_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

  /**
   * Puts a rebuilt filter in place at once: renames the temporary
   * key over the live one and removes its TTL. KEYS[1] temporary key, KEYS[2] live key.
   */
  static readonly SWAP_REBUILT = new LuaScript(`
redis.call('RENAME', KEYS[1], KEYS[2])
redis.call('PERSIST', KEYS[2])
return 1
`);

  /**
   * Returns the key of a filter, `<prefix>:bloom:{name}`. The name goes in a hash
   * tag, so the live key and the rebuild keys share a slot in a cluster
   * and the swap script can touch both.
   * @param keyspace Service keyspace.
   * @param name Filter name.
   * @returns The key.
   * @throws InvalidParametersError with an empty name, with characters outside `[A-Za-z0-9._:-]` or longer than 128.
   */
  static filter(keyspace: ValkeyKeyspace, name: string): string {
    if (!BloomKeys.NAME_PATTERN.test(name)) {
      throw new InvalidParametersError(
        'name must have 1 to 128 characters in [A-Za-z0-9._:-]',
      );
    }
    return keyspace.key('bloom', `{${name}}`);
  }

  /**
   * Returns the temporary key that a rebuild fills before the swap.
   * @param liveKey Key of the live filter.
   * @param ids Generator of the rebuild id.
   * @returns The temporary key.
   */
  static rebuild(liveKey: string, ids: IdGenerator): string {
    return `${liveKey}:rebuild:${ids.next().toString()}`;
  }

  /**
   * Splits the items into batches the size of one command.
   * @param items Items to split.
   * @param size Batch size.
   * @returns The batches.
   */
  static *batches<T>(
    items: readonly T[],
    size: number = BloomKeys.BATCH_SIZE,
  ): Iterable<readonly T[]> {
    for (let start = 0; start < items.length; start += size) {
      yield items.slice(start, start + size);
    }
  }
}
