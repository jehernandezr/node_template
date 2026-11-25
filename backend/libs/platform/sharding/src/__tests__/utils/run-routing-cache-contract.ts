import type { RoutingCache } from '../../ports/routing-cache.js';

/** What the contract test needs from a shared cache: the port and how to advance time. */
export interface RoutingCacheContractSubject {
  readonly cache: RoutingCache;
  /** Advances time by `ms` milliseconds (fake in-memory clock; real wait in the adapter). */
  advance(ms: number): Promise<void>;
}

const KEY = 'sharding:placement:contract';
const TTL_MS = 1000;

/**
 * Contract test of `RoutingCache`: both the in-memory double and the real adapter run it.
 * @param factory Creates an empty, isolated cache for each test.
 */
export function runRoutingCacheContract(
  name: string,
  factory: () => Promise<RoutingCacheContractSubject>,
): void {
  describe(name, () => {
    it('returns undefined for a missing key', async () => {
      const { cache } = await factory();
      await expect(cache.get(KEY)).resolves.toBeUndefined();
    });

    it('writes a value into a missing key', async () => {
      const { cache } = await factory();
      await expect(cache.setIfNewer(KEY, 'a', 1, TTL_MS)).resolves.toBe(true);
      await expect(cache.get(KEY)).resolves.toBe('a');
    });

    it.each([
      [5, false, 'a'],
      [4, false, 'a'],
      [6, true, 'b'],
    ])(
      'with version %p over a stored version 5 writes %p and keeps %p',
      async (version, written, finalValue) => {
        const { cache } = await factory();
        await cache.setIfNewer(KEY, 'a', 5, TTL_MS);
        await expect(cache.setIfNewer(KEY, 'b', version, TTL_MS)).resolves.toBe(
          written,
        );
        await expect(cache.get(KEY)).resolves.toBe(finalValue);
      },
    );

    it('accepts a lower version once the entry has expired', async () => {
      const { cache, advance } = await factory();
      await cache.setIfNewer(KEY, 'a', 5, TTL_MS);
      await advance(TTL_MS + 1);
      await expect(cache.get(KEY)).resolves.toBeUndefined();
      await expect(cache.setIfNewer(KEY, 'b', 4, TTL_MS)).resolves.toBe(true);
    });

    it('deletes a key', async () => {
      const { cache } = await factory();
      await cache.setIfNewer(KEY, 'a', 1, TTL_MS);
      await cache.delete(KEY);
      await expect(cache.get(KEY)).resolves.toBeUndefined();
    });
  });
}
