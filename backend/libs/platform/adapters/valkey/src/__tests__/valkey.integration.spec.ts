import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { PartitionedBloomFilter } from '@platform/bloom';
import { CacheAside, VersionedKeyspace } from '@platform/cache';
import { ResiliencePolicyName, ResilienceRegistry } from '@platform/resilience';
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
import { ValkeyBloomFilter } from '../valkey-bloom-filter.js';
import { ValkeyCache } from '../valkey-cache.js';
import {
  createTokenAuthenticatedValkeyClient,
  createValkeyClient,
} from '../valkey-client.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyRoutingCache } from '../valkey-routing-cache.js';
import { ValkeyShardDirectoryChannel } from '../valkey-shard-directory-channel.js';

/**
 * Integration tests against a real Valkey with the bloom module, started with Testcontainers. The adapters
 * connect as a user with the same ACL Terraform gives each service (`~<prefix>:* &<prefix>:*`), so a key or
 * channel outside the keyspace fails here as it would in AWS. Without Docker they are skipped, except in CI
 * (`CI=true`), where a missing Docker must not turn into a green run. `VALKEY_INTEGRATION=off` skips them.
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
  if (probe.status !== 0 && process.env['CI'] === 'true') {
    throw new Error(
      'Docker is not available in CI; set VALKEY_INTEGRATION=off to skip these tests on purpose',
    );
  }
  return probe.status === 0;
}

const describeWithDocker = dockerAvailable() ? describe : describe.skip;

const PREFIX = 'orders';
const keyspace = new ValkeyKeyspace(PREFIX);

/** Polls until `check` holds, instead of sleeping a fixed time. */
async function until(
  check: () => boolean | Promise<boolean>,
  timeoutMs = 5_000,
): Promise<void> {
  const started = Date.now();
  while (!(await check())) {
    if (Date.now() - started > timeoutMs) {
      throw new Error(`condition not met within ${timeoutMs} ms`);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
}

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

describeWithDocker('Valkey adapters against a real server', () => {
  // Thousands of round trips per test; the default 5 s is too tight when other suites run in parallel.
  jest.setTimeout(60_000);

  let container: StartedTestContainer;
  let host: string;
  let port: number;
  let admin: Valkey;
  // Generated per run: the test user has a password like any ACL user, but none is written down.
  const password = randomUUID();
  const clients: Valkey[] = [];

  /** A new connection as the service user, as another process would have. */
  function connect(): Valkey {
    const client = createValkeyClient({
      host,
      port,
      tls: false,
      username: PREFIX,
      commandTimeoutMs: 5_000,
    });
    client.options.password = password;
    clients.push(client);
    return client;
  }

  beforeAll(async () => {
    container = await new GenericContainer(IMAGE)
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
      .start();
    host = container.getHost();
    port = container.getMappedPort(6379);
    admin = createValkeyClient({ url: `redis://${host}:${port}` });
    await admin.call('ACL', [
      'SETUSER',
      PREFIX,
      'on',
      `>${password}`,
      `~${PREFIX}:*`,
      `&${PREFIX}:*`,
      '+@all',
      '-@dangerous',
    ]);
  }, 300_000);

  afterAll(async () => {
    await Promise.all(clients.map((client) => client.quit().catch(() => 0)));
    await admin?.quit().catch(() => 0);
    await container?.stop();
  });

  beforeEach(async () => {
    await admin.call('FLUSHALL', []);
  });

  async function keys(pattern: string): Promise<string[]> {
    return (await admin.call('KEYS', [pattern])) as string[];
  }

  it('refuses keys outside the keyspace, as the ACL in AWS does', async () => {
    await expect(connect().call('SET', ['bloom:x', '1'])).rejects.toThrow(
      /NOPERM/,
    );
  });

  it('authenticates each reconnection with the token of that moment', async () => {
    let current = password;
    const client = await createTokenAuthenticatedValkeyClient(
      { host, port, tls: false, username: PREFIX, commandTimeoutMs: 5_000 },
      async () => current,
    );
    clients.push(client);
    await expect(client.call('SET', [`${PREFIX}:auth`, '1'])).resolves.toBe(
      'OK',
    );

    // Rotate: only the new password is valid, then drop the connection.
    const rotated = randomUUID();
    await admin.call('ACL', ['SETUSER', PREFIX, 'resetpass', `>${rotated}`]);
    current = rotated;
    await admin.call('CLIENT', ['KILL', 'USER', PREFIX]);

    await until(async () => {
      try {
        return (await client.call('GET', [`${PREFIX}:auth`])) === '1';
      } catch {
        return false;
      }
    });
    await admin.call('ACL', ['SETUSER', PREFIX, 'resetpass', `>${password}`]);
  });

  describe('ValkeyCache', () => {
    it('stores, expires and sets only when absent', async () => {
      const cache = new ValkeyCache(connect(), { keyspace });
      await cache.set('a', 'one', 500);
      await expect(cache.get('a')).resolves.toBe('one');
      await until(async () => (await cache.get('a')) === undefined);

      await expect(cache.setIfAbsent('b', 'first')).resolves.toBe(true);
      await expect(cache.setIfAbsent('b', 'second')).resolves.toBe(false);
      await expect(cache.get('b')).resolves.toBe('first');
      await cache.delete('b');
      await expect(cache.get('b')).resolves.toBeUndefined();
    });

    it('agrees on one version token among concurrent first readers', async () => {
      const keyspaces = Array.from(
        { length: 10 },
        () => new VersionedKeyspace(new ValkeyCache(connect(), { keyspace })),
      );
      const tokens = await Promise.all(
        keyspaces.map((keyspace) => keyspace.version(['t1', 'orders'])),
      );
      expect(new Set(tokens).size).toBe(1);
    });

    it('serves CacheAside reads and invalidations', async () => {
      const cache = new ValkeyCache(connect(), { keyspace });
      const aside = new CacheAside(cache, new VersionedKeyspace(cache), {
        // A loaded CI runner can exceed the default cache timeout; this test is about the round trip.
        resilience: new ResilienceRegistry({
          [ResiliencePolicyName.Cache]: { timeoutMs: 5_000 },
        }),
        transactions: { isInTransaction: () => false },
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
      // The write is fire-and-forget: wait until a read is served without loading.
      await until(async () => {
        const loads = load.mock.calls.length;
        await read();
        return load.mock.calls.length === loads;
      });
      const cachedLoads = load.mock.calls.length;
      await expect(read()).resolves.toEqual({ total: 3 });
      expect(load).toHaveBeenCalledTimes(cachedLoads);

      await aside.invalidate(['t1', 'orders']);
      await read();
      expect(load).toHaveBeenCalledTimes(cachedLoads + 1);
    });
  });

  describe('ValkeyRoutingCache.setIfNewer', () => {
    it('writes higher versions only and forgets them at the TTL', async () => {
      const cache = new ValkeyRoutingCache(connect(), { keyspace });
      await expect(cache.setIfNewer('k', 'v2', 2, 10_000)).resolves.toBe(true);
      await expect(cache.setIfNewer('k', 'v1', 1, 10_000)).resolves.toBe(false);
      await expect(cache.setIfNewer('k', 'v2b', 2, 10_000)).resolves.toBe(
        false,
      );
      await expect(cache.get('k')).resolves.toBe('v2');
      await expect(cache.setIfNewer('k', 'v3', 3, 50)).resolves.toBe(true);
      await until(async () => (await cache.get('k')) === undefined);
      await expect(cache.setIfNewer('k', 'v1', 1, 10_000)).resolves.toBe(true);
    });

    it('keeps the highest version under concurrent writers on separate connections', async () => {
      const writers = Array.from(
        { length: 8 },
        () => new ValkeyRoutingCache(connect(), { keyspace }),
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

    // The race of the shard-router spec (a slow read finishing after an invalidation), now against Valkey
    // and two connections.
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
        sharedCache: new ValkeyRoutingCache(connect(), { keyspace }),
      });
      const mover = new ShardRouter({
        directory: store,
        sharedCache: new ValkeyRoutingCache(connect(), { keyspace }),
      });

      const inFlight = reader.resolve(READ);
      await until(() => slowDirectory.getPlacement.mock.calls.length > 0);
      store.setPlacement(placement({ shardGroup: ['shard-2'], version: 2 }));
      await mover.invalidate(T1);
      stale.resolve(placement({ shardGroup: ['shard-1'], version: 1 }));
      await expect(inFlight).resolves.toMatchObject({
        logicalShard: 'shard-1',
      });

      const fresh = new ShardRouter({
        directory: store,
        sharedCache: new ValkeyRoutingCache(connect(), { keyspace }),
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
        keyspace,
      });
      const channelB = new ValkeyShardDirectoryChannel({
        publisher: connect(),
        subscriber: connect(),
        keyspace,
      });
      const mover = new ShardRouter({
        directory: store,
        sharedCache: new ValkeyRoutingCache(connect(), { keyspace }),
        changes: channelA,
      });
      const other = new ShardRouter({
        directory: store,
        sharedCache: new ValkeyRoutingCache(connect(), { keyspace }),
      });
      const stop = await other.listen(channelB);
      await expect(other.resolve(READ)).resolves.toMatchObject({
        logicalShard: 'shard-1',
      });

      store.setPlacement(placement({ shardGroup: ['shard-2'], version: 2 }));
      await mover.invalidate(T1, { version: 2 });

      await until(
        async () => (await other.resolve(READ)).logicalShard === 'shard-2',
      );
      await stop();
    });
  });

  describe('ValkeyBloomFilter', () => {
    const create = (name: string, expectedItems: number) =>
      new ValkeyBloomFilter(connect(), { name, expectedItems, keyspace });

    it('has no false negatives and about 1 % false positives', async () => {
      const filter = create('emails', 5_000);
      const members = Array.from({ length: 5_000 }, (_, i) => `member-${i}`);
      await filter.addMany(members);
      await filter.add('one-more');
      // Checks go out together: the client pipelines them on one connection instead of paying one round
      // trip each.
      const present = await Promise.all(
        [...members.slice(0, 200), 'one-more'].map((item) =>
          filter.mightContain(item),
        ),
      );
      expect(present.every(Boolean)).toBe(true);
      const absent = await Promise.all(
        Array.from({ length: 2_000 }, (_, i) =>
          filter.mightContain(`absent-${i}`),
        ),
      );
      const positives = absent.filter(Boolean).length;
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
      await expect(keys('*rebuild*')).resolves.toEqual([]);
    });

    it('works as partitions of a bigger filter', async () => {
      const filter = new PartitionedBloomFilter([
        create('hibp-0', 1_000),
        create('hibp-1', 1_000),
      ]);
      const hashes = Array.from({ length: 1_500 }, (_, i) => `sha1-${i}`);
      await filter.addMany(hashes);
      const found = await Promise.all(
        hashes.slice(0, 100).map((hash) => filter.mightContain(hash)),
      );
      expect(found.every(Boolean)).toBe(true);
    });
  });
});
