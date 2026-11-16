import { BloomFilter, InMemoryAsyncBloomFilter } from '@platform/bloom';
import { GatedRebuildSource } from './utils/gated-rebuild-source.js';
import { RevokedSessionRegistry } from '../revoked-session-registry.js';

function registry(): RevokedSessionRegistry {
  return new RevokedSessionRegistry(
    new InMemoryAsyncBloomFilter(BloomFilter.create({ expectedItems: 1000 })),
  );
}

describe('RevokedSessionRegistry', () => {
  describe('warmth', () => {
    it('is cold at start and answers no for any session', async () => {
      const cold = registry();

      expect(cold.isWarm()).toBe(false);
      expect(await cold.mightContain('anything')).toBe(false);
    });

    it('becomes warm with the sessions of a rebuild', async () => {
      const warm = registry();

      await warm.rebuild([['a', 'b']]);

      expect(warm.isWarm()).toBe(true);
      expect(await warm.mightContain('a')).toBe(true);
      expect(await warm.mightContain('zz')).toBe(false);
    });

    it('keeps the sessions added after a rebuild', async () => {
      const warm = registry();
      await warm.rebuild([['a']]);

      await warm.add('c');

      expect(await warm.mightContain('c')).toBe(true);
    });

    it('stays cold when the first rebuild fails', async () => {
      const cold = registry();
      const failure = new Error('index unreadable');
      const source = new GatedRebuildSource([], failure);
      source.release();

      await expect(cold.rebuild(source)).rejects.toBe(failure);

      expect(cold.isWarm()).toBe(false);
    });

    it('keeps the previous contents when a later rebuild fails', async () => {
      const warm = registry();
      await warm.rebuild([['a']]);
      const failure = new Error('index unreadable');
      const source = new GatedRebuildSource([], failure);
      source.release();

      await expect(warm.rebuild(source)).rejects.toBe(failure);

      expect(warm.isWarm()).toBe(true);
      expect(await warm.mightContain('a')).toBe(true);
    });
  });

  describe('concurrent revocations and rebuilds', () => {
    it('keeps a revocation added while the rebuild is paused', async () => {
      const warm = registry();
      const source = new GatedRebuildSource([['a']]);
      const pending = warm.rebuild(source);
      await source.waitUntilReading();

      await warm.add('late');
      expect(await warm.mightContain('late')).toBe(true);

      source.release();
      await pending;

      expect(await warm.mightContain('late')).toBe(true);
      expect(await warm.mightContain('a')).toBe(true);
    });

    it('shares one rebuild between simultaneous calls', async () => {
      const shared = registry();
      const first = new GatedRebuildSource([['a']]);
      const second = new GatedRebuildSource([['b']]);
      const running = shared.rebuild(first);
      const joined = shared.rebuild(second);
      await first.waitUntilReading();

      first.release();
      await Promise.all([running, joined]);

      expect(first.reads).toBe(1);
      expect(second.reads).toBe(0);
      expect(await shared.mightContain('a')).toBe(true);
      expect(await shared.mightContain('b')).toBe(false);
    });
  });
});
