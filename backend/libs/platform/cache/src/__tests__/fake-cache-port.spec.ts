import { FixedClock } from '@platform/kernel/test-utils';
import { runCachePortContract } from './utils/index.js';
import { FakeCachePort } from './utils/fake-cache-port.js';

runCachePortContract('FakeCachePort', (clock) => ({
  cache: new FakeCachePort(clock),
  advance: async (ms: number): Promise<void> => {
    clock.advance(ms);
  },
}));

describe('FakeCachePort', () => {
  it('counts the operations it receives', async () => {
    const cache = new FakeCachePort(new FixedClock());
    await cache.set('key', 'value');
    await cache.get('key');
    await cache.delete('key');
    expect([cache.sets, cache.gets, cache.deletes]).toEqual([1, 1, 1]);
  });

  it('rejects every operation while it fails and answers again after recover', async () => {
    const cache = new FakeCachePort(new FixedClock());
    await cache.set('key', 'value');
    cache.fail(new Error('down'));
    await expect(cache.get('key')).rejects.toThrow('down');
    await expect(cache.set('key', 'next')).rejects.toThrow('down');
    await expect(cache.setIfAbsent('key', 'next')).rejects.toThrow('down');
    await expect(cache.delete('key')).rejects.toThrow('down');
    cache.recover();
    await expect(cache.get('key')).resolves.toBe('value');
  });
});
