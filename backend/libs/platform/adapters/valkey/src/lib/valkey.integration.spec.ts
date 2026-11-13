import { spawnSync } from 'node:child_process';
import { BloomFilter, PartitionedBloomFilter } from '@platform/bloom';
import {
  CacheAside,
  CacheNotACounterError,
  VersionedKeyspace,
} from '@platform/cache';
import { ResilienceRegistry } from '@platform/resilience';
import {
  InMemoryDirectoryStore,
  ShardAccess,
  ShardKey,
  ShardRouter,
  TenantStatus,
  type TenantPlacement,
} from '@platform/sharding';
import type { Valkey } from 'iovalkey';
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from 'testcontainers';
import { ValkeyBitmapBloomFilter } from './valkey-bitmap-bloom-filter.js';
import { ValkeyBloomFilter } from './valkey-bloom-filter.js';
import { ValkeyCache } from './valkey-cache.js';
import { createValkeyClient } from './valkey-client.js';
import { ValkeyRoutingCache } from './valkey-routing-cache.js';
import { ValkeyShardDirectoryChannel } from './valkey-shard-directory-channel.js';

/**
 * Integration tests against a real Valkey with the bloom module, started with Testcontainers. They run only
 * when Docker answers, so `nx test` passes on a machine without Docker. `VALKEY_INTEGRATION=off` skips them.
 */
const IMAGE = 'valkey/valkey-bundle:8.1';

function dockerAvailable(): boolean {
  if (process.env['VALKEY_INTEGRATION'] === 'off') {
    return false;
  }
  const probe = spawnSync('docker', ['info'], {
    stdio: 'ignore',
    timeout: 10_000,
  });
  return probe.status === 0;
}

const describeWithDocker = dockerAvailable() ? describe : describe.skip;

const T1 = '01941f29-7c00-7000-8000-000000000001';
const READ = {
  tenantId: T1,
  keyKind: ShardKey.Tenant,
  access: ShardAccess.Read,
} as const;

function placement(overrides: Partial<TenantPlacement> = {}): TenantPlacement {
  return {
    tenantId: T1,
    region: 'eu',
    shardGroup: ['shard-1'],
    status: TenantStatus.Active,
    version: 1,
    dedicated: false,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describeWithDocker('Valkey adapters against a real server', () => {
  let container: StartedTestContainer;
  let url: string;
  const clients: Valkey[] = [];

  /** A new connection, as another process would have. */
  function connect(): Valkey {
    const client = createValkeyClient({ url, commandTimeoutMs: 5_000 });
    clients.push(client);
    return client;
  }

  beforeAll(async () => {
    container = await new GenericContainer(IMAGE)
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();
    url = `redis://${container.getHost()}:${container.getMappedPort(6379)}`;
  }, 300_000);

  afterAll(async () => {
    await Promise.all(clients.map((client) => client.quit().catch(() => 0)));
    await container?.stop();
  });

  beforeEach(async () => {
    await connect().call('FLUSHALL', []);
  });

  describe('ValkeyCache', () => {
    it('stores, expires, sets only when absent and counts', async () => {
      const cache = new ValkeyCache(connect(), { keyPrefix: 'test:' });
      await cache.set('a', 'one', 50);
      await expect(cache.get('a')).resolves.toBe('one');
      await sleep(120);
      await expect(cache.get('a')).resolves.toBeUndefined();

      await expect(cache.setIfAbsent('b', 'first')).resolves.toBe(true);
      await expect(cache.setIfAbsent('b', 'second')).resolves.toBe(false);
      await expect(cache.get('b')).resolves.toBe('first');

      await expect(cache.incr('n')).resolves.toBe(1);
      await expect(cache.incr('n')).resolves.toBe(2);
      await expect(cache.incr('b')).rejects.toBeInstanceOf(
        CacheNotACounterError,
      );
      await cache.delete('b');
      await expect(cache.get('b')).resolves.toBeUndefined();
    });

    it('agrees on one version token among concurrent first readers', async () => {
      const keyspaces = Array.from(
        { length: 10 },
        () => new VersionedKeyspace(new ValkeyCache(connect())),
      );
      const tokens = await Promise.all(
        keyspaces.map((keyspace) => keyspace.version(['t1', 'orders'])),
      );
      expect(new Set(tokens).size).toBe(1);
    });

    it('serves CacheAside reads and invalidations', async () => {
      const cache = new ValkeyCache(connect());
      const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
        resilience: new ResilienceRegistry(),
      });
      const load = jest.fn(async () => ({ total: 3 }));
      const read = () =>
        aside.getOrLoad({
          namespace: ['t1', 'orders'],
          params: { page: 1 },
          ttlMs: 5_000,
          load,
        });

      await expect(read()).resolves.toEqual({ total: 3 });
      await sleep(50); // the write is fire-and-forget
      await expect(read()).resolves.toEqual({ total: 3 });
      expect(load).toHaveBeenCalledTimes(1);

      await aside.invalidate(['t1', 'orders']);
      await read();
      expect(load).toHaveBeenCalledTimes(2);
    });
  });

  describe('ValkeyRoutingCache.setIfNewer', () => {
    it('writes higher versions only and forgets them at the TTL', async () => {
      const cache = new ValkeyRoutingCache(connect());
      await expect(cache.setIfNewer('k', 'v2', 2, 10_000)).resolves.toBe(true);
      await expect(cache.setIfNewer('k', 'v1', 1, 10_000)).resolves.toBe(false);
      await expect(cache.setIfNewer('k', 'v2b', 2, 10_000)).resolves.toBe(
        false,
      );
      await expect(cache.get('k')).resolves.toBe('v2');
      await expect(cache.setIfNewer('k', 'v3', 3, 50)).resolves.toBe(true);
      await sleep(120);
      await expect(cache.get('k')).resolves.toBeUndefined();
      await expect(cache.setIfNewer('k', 'v1', 1, 10_000)).resolves.toBe(true);
    });

    it('keeps the highest version under concurrent writers on separate connections', async () => {
      const writers = Array.from(
        { length: 8 },
        () => new ValkeyRoutingCache(connect()),
      );
      const versions = Array.from({ length: 200 }, (_, i) => (i * 37) % 200);
      const results = await Promise.all(
        versions.map((version, i) =>
          writers[i % writers.length].setIfNewer(
            'race',
            `value-${version}`,
            version,
            10_000,
          ),
        ),
      );
      await expect(writers[0].get('race')).resolves.toBe('value-199');
      // Each accepted write raised the version, so there are never more wins than distinct versions.
      expect(results.filter(Boolean).length).toBeLessThanOrEqual(200);
    });

    // The race of shard-router.spec.ts (audit P1.7), now against Valkey and two connections.
    it('does not let a read in flight in another process resurrect an invalidated placement', async () => {
      const store = new InMemoryDirectoryStore();
      store.setInstance('shard-1', 'pg-1');
      store.setInstance('shard-2', 'pg-2');
      store.setPlacement(placement({ shardGroup: ['shard-1'], version: 1 }));
      const stale = deferred<TenantPlacement | undefined>();
      const slowDirectory = {
        getPlacement: jest
          .fn((tenantId: string) => store.getPlacement(tenantId))
          .mockImplementationOnce(() => stale.promise),
        getInstance: (shard: string) => store.getInstance(shard),
      };
      const reader = new ShardRouter({
        directory: slowDirectory,
        sharedCache: new ValkeyRoutingCache(connect()),
      });
      const mover = new ShardRouter({
        directory: store,
        sharedCache: new ValkeyRoutingCache(connect()),
      });

      const inFlight = reader.resolve(READ);
      await sleep(20);
      store.setPlacement(placement({ shardGroup: ['shard-2'], version: 2 }));
      await mover.invalidate(T1);
      stale.resolve(placement({ shardGroup: ['shard-1'], version: 1 }));
      await expect(inFlight).resolves.toMatchObject({
        logicalShard: 'shard-1',
      });

      const fresh = new ShardRouter({
        directory: store,
        sharedCache: new ValkeyRoutingCache(connect()),
      });
      await expect(fresh.resolve(READ)).resolves.toMatchObject({
        logicalShard: 'shard-2',
      });
    });
  });

  describe('ShardDirectoryChanged over pub/sub', () => {
    it('drops the placement in another process right after a move', async () => {
      const store = new InMemoryDirectoryStore();
      store.setInstance('shard-1', 'pg-1');
      store.setInstance('shard-2', 'pg-2');
      store.setPlacement(placement({ shardGroup: ['shard-1'], version: 1 }));

      const channelA = new ValkeyShardDirectoryChannel({
        publisher: connect(),
        subscriber: connect(),
      });
      const channelB = new ValkeyShardDirectoryChannel({
        publisher: connect(),
        subscriber: connect(),
      });
      const mover = new ShardRouter({
        directory: store,
        sharedCache: new ValkeyRoutingCache(connect()),
        changes: channelA,
      });
      const other = new ShardRouter({
        directory: store,
        sharedCache: new ValkeyRoutingCache(connect()),
      });
      const stop = await other.listen(channelB);
      await expect(other.resolve(READ)).resolves.toMatchObject({
        logicalShard: 'shard-1',
      });

      store.setPlacement(placement({ shardGroup: ['shard-2'], version: 2 }));
      await mover.invalidate(T1, { version: 2 });
      await sleep(100);

      await expect(other.resolve(READ)).resolves.toMatchObject({
        logicalShard: 'shard-2',
      });
      await stop();
    });
  });

  describe.each([
    [
      'BF.* module',
      (name: string, expectedItems: number) =>
        new ValkeyBloomFilter(connect(), { name, expectedItems }),
    ],
    [
      'bitmap',
      (name: string, expectedItems: number) =>
        new ValkeyBitmapBloomFilter(connect(), { name, expectedItems }),
    ],
  ])('bloom filter on %s', (_label, create) => {
    it('has no false negatives and about 1 % false positives', async () => {
      const filter = create('emails', 5_000);
      const members = Array.from({ length: 5_000 }, (_, i) => `member-${i}`);
      await filter.addMany(members);
      await filter.add('one-more');
      for (const item of [...members.slice(0, 200), 'one-more']) {
        await expect(filter.mightContain(item)).resolves.toBe(true);
      }
      let positives = 0;
      for (let i = 0; i < 2_000; i += 1) {
        if (await filter.mightContain(`absent-${i}`)) {
          positives += 1;
        }
      }
      expect(positives / 2_000).toBeLessThan(0.03);
    });

    it('rebuilds from the source and swaps atomically', async () => {
      const filter = create('tokens', 1_000);
      await filter.add('revoked-long-ago');
      async function* source(): AsyncIterable<readonly string[]> {
        yield ['fresh-1', 'fresh-2'];
      }
      await filter.rebuild(source());
      await expect(filter.mightContain('fresh-1')).resolves.toBe(true);
      await expect(filter.mightContain('revoked-long-ago')).resolves.toBe(
        false,
      );
      const keys = (await connect().call('KEYS', ['*rebuild*'])) as string[];
      expect(keys).toEqual([]);
    });

    it('works as partitions of a bigger filter', async () => {
      const filter = new PartitionedBloomFilter([
        create('hibp-0', 1_000),
        create('hibp-1', 1_000),
      ]);
      const hashes = Array.from({ length: 1_500 }, (_, i) => `sha1-${i}`);
      await filter.addMany(hashes);
      for (const hash of hashes.slice(0, 100)) {
        await expect(filter.mightContain(hash)).resolves.toBe(true);
      }
    });
  });

  it('loads an in-memory filter into a bitmap bit for bit', async () => {
    const local = BloomFilter.create({ expectedItems: 500 });
    const remote = new ValkeyBitmapBloomFilter(connect(), {
      name: 'offline',
      expectedItems: 500,
    });
    const items = Array.from({ length: 500 }, (_, i) => `item-${i}`);
    items.forEach((item) => local.add(item));
    await remote.load(local);
    for (let i = 0; i < 1_000; i += 1) {
      const probe = `item-${i}`;
      await expect(remote.mightContain(probe)).resolves.toBe(
        local.mightContain(probe),
      );
    }

    // And the other way: bits written through Valkey read back as the in-memory layout.
    const written = new ValkeyBitmapBloomFilter(connect(), {
      name: 'online',
      expectedItems: 500,
    });
    await written.addMany(items);
    const raw = (await connect().callBuffer('GET', [written.key])) as Buffer;
    const bytes = Buffer.alloc(Math.ceil(written.bits / 8));
    raw.copy(bytes);
    const copy = BloomFilter.deserialize({
      ...local.serialize(),
      data: bytes.toString('base64'),
    });
    expect(items.every((item) => copy.mightContain(item))).toBe(true);
  });
});
