import { FixedClock } from '@platform/kernel/test-utils';
import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import { CountingDirectoryStore } from '../../__tests__/utils/index.js';
import { InstanceResolver } from '../instance-resolver.js';

const LOCAL_TTL_MS = 60_000;

describe('InstanceResolver', () => {
  let clock: FixedClock;
  let directory: CountingDirectoryStore;

  beforeEach(() => {
    clock = new FixedClock();
    directory = new CountingDirectoryStore();
    directory.setInstance('shard-1', 'node-a');
    directory.setInstance('shard-2', 'node-b');
  });

  function resolverWith(maxInstances = 10): InstanceResolver {
    return new InstanceResolver(directory, clock, LOCAL_TTL_MS, maxInstances);
  }

  describe('load', () => {
    it('reads the directory once and then serves the instance from the cache', async () => {
      const resolver = resolverWith();

      await expect(resolver.load('shard-1')).resolves.toBe('node-a');

      expect(resolver.cached('shard-1')).toBe('node-a');
      expect(directory.instanceReads).toBe(1);
    });

    it('rejects with UnknownShard when the directory lacks the shard', async () => {
      await expect(resolverWith().load('shard-x')).rejects.toMatchObject({
        code: ShardingErrorCode.UnknownShard,
        details: { logicalShard: 'shard-x' },
      });
    });

    it('expires the cached instance after localTtlMs', async () => {
      const resolver = resolverWith();
      await resolver.load('shard-1');

      clock.advance(LOCAL_TTL_MS - 1);
      expect(resolver.cached('shard-1')).toBe('node-a');

      clock.advance(1);
      expect(resolver.cached('shard-1')).toBeUndefined();
    });

    it('does not cache an instance whose shard was invalidated during the read', async () => {
      const resolver = resolverWith();
      const release = directory.hold();

      const loading = resolver.load('shard-1');
      resolver.invalidate('shard-1');
      release();
      await loading;

      expect(resolver.cached('shard-1')).toBeUndefined();
    });
  });

  describe('invalidate', () => {
    it('drops the cached instance so the next load reads the directory again', async () => {
      const resolver = resolverWith();
      await resolver.load('shard-1');

      resolver.invalidate('shard-1');
      expect(resolver.cached('shard-1')).toBeUndefined();

      await resolver.load('shard-1');
      expect(directory.instanceReads).toBe(2);
    });

    it('evicts the least recently used shard beyond maxInstances', async () => {
      const resolver = resolverWith(1);

      await resolver.load('shard-1');
      await resolver.load('shard-2');

      expect(resolver.cached('shard-1')).toBeUndefined();
      expect(resolver.cached('shard-2')).toBe('node-b');
    });
  });
});
