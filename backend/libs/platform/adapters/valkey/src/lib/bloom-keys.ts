import { InvalidParameters } from '@platform/bloom';
import type { IdGenerator } from '@platform/kernel';
import { LuaScript } from './valkey-client.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';

/** Longest a temporary rebuild key lives if its job dies half way. */
export const REBUILD_KEY_TTL_MS = 6 * 60 * 60 * 1_000;

/** Items sent per command when adding many. */
export const BLOOM_BATCH_SIZE = 1_000;

const NAME_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

/**
 * Key of a filter, `<prefix>:bloom:{name}`. The name goes in a hash tag, so the live key and its rebuild keys
 * share a cluster slot and the swap script can touch both.
 * @throws {InvalidParameters} for an empty name, characters outside `[A-Za-z0-9._:-]`, or more than 128.
 */
export function bloomKey(keyspace: ValkeyKeyspace, name: string): string {
  if (!NAME_PATTERN.test(name)) {
    throw new InvalidParameters(
      'name must have 1 to 128 characters in [A-Za-z0-9._:-]',
    );
  }
  return keyspace.key('bloom', `{${name}}`);
}

/** Temporary key a rebuild fills before the swap. */
export function rebuildKey(liveKey: string, ids: IdGenerator): string {
  return `${liveKey}:rebuild:${ids.next().toString()}`;
}

/**
 * Puts a rebuilt filter in place in one atomic step: renames the temporary key over the live one and drops
 * its TTL. KEYS[1] temporary key, KEYS[2] live key.
 */
export const SWAP_REBUILT = new LuaScript(`
redis.call('RENAME', KEYS[1], KEYS[2])
redis.call('PERSIST', KEYS[2])
return 1
`);

/** Splits items into command-sized batches. */
export function* batches<T>(
  items: readonly T[],
  size: number = BLOOM_BATCH_SIZE,
): Iterable<readonly T[]> {
  for (let start = 0; start < items.length; start += size) {
    yield items.slice(start, start + size);
  }
}
