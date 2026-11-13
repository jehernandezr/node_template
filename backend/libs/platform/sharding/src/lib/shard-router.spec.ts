import { FixedClock } from '@platform/kernel/testing';
import { Deadline, DeadlineExceededError } from '@platform/primitives';
import { ConsistentHashRing } from './consistent-hash-ring.js';
import {
  InMemoryShardDirectoryChannel,
  ShardDirectoryChangeKind,
  ShardingEvent,
} from './directory-changes.js';
import {
  ShardingError,
  ShardingErrorCode,
  WrongRegionError,
} from './errors.js';
import { InMemoryDirectoryStore } from './in-memory-directory-store.js';
import { InMemoryRoutingCache } from './in-memory-routing-cache.js';
import {
  decodeSharedRecord,
  UNVERSIONED_TOMBSTONE_VERSION,
} from './placement-codec.js';
import type { RoutingCache } from './ports.js';
import {
  MAX_TENANT_ID_LENGTH,
  ShardRouter,
  type ShardRouterOptions,
} from './shard-router.js';
import {
  ShardAccess,
  ShardKey,
  TenantStatus,
  type TenantPlacement,
} from './types.js';

const LOCAL_TTL = 60_000;
const SHARED_TTL = 300_000;
const T1 = '01941f29-7c00-7000-8000-000000000001';
const T2 = '01941f29-7c00-7000-8000-000000000002';
const T3 = '01941f29-7c00-7000-8000-000000000003';
const PLACEMENT_KEY = `sharding:placement:${T1}`;
const TOMBSTONE_TTL = 30_000;
const FAR_FUTURE = 1e12;

const READ = { keyKind: ShardKey.Tenant, access: ShardAccess.Read } as const;
const WRITE = { keyKind: ShardKey.Tenant, access: ShardAccess.Write } as const;

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
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const failingCache: RoutingCache = {
  get: () => Promise.reject(new Error('valkey down')),
  setIfNewer: () => Promise.reject(new Error('valkey down')),
  delete: () => Promise.reject(new Error('valkey down')),
};

function setup() {
  const clock = new FixedClock(new Date(0));
  const store = new InMemoryDirectoryStore();
  store.setInstance('shard-1', 'pg-1');
  store.setInstance('shard-2', 'pg-2');
  store.setInstance('shard-3', 'pg-3');
  const directory = {
    getPlacement: jest.fn((tenantId: string) => store.getPlacement(tenantId)),
    getInstance: jest.fn((logicalShard: string) =>
      store.getInstance(logicalShard),
    ),
  };
  const shared = new InMemoryRoutingCache(clock);
  const build = (options: Partial<ShardRouterOptions> = {}) =>
    new ShardRouter({ directory, clock, ...options });
  return {
    store,
    directory,
    shared,
    build,
    advance: (ms: number) => clock.advance(ms),
  };
}

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
}

describe('ShardRouter', () => {
  describe('resolve', () => {
    it('resolves a single-shard tenant to its shard and instance', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build();
      await expect(router.resolve({ tenantId: T1, ...READ })).resolves.toEqual({
        tenantId: T1,
        region: 'eu',
        logicalShard: 'shard-1',
        instance: 'pg-1',
        status: TenantStatus.Active,
      });
    });

    it('throws KeyMissing when tenantId is empty', async () => {
      const env = setup();
      const router = env.build();
      const error = await errorOf(router.resolve({ tenantId: '', ...READ }));
      expect(error).toBeInstanceOf(ShardingError);
      expect((error as ShardingError).code).toBe(ShardingErrorCode.KeyMissing);
      expect(env.directory.getPlacement).not.toHaveBeenCalled();
    });

    it.each([ShardKey.User, ShardKey.Custom])(
      'throws KeyMissing when key kind %s has no keyValue',
      async (keyKind) => {
        const env = setup();
        env.store.setPlacement(
          placement({ shardGroup: ['shard-1', 'shard-2'] }),
        );
        const router = env.build();
        for (const keyValue of [undefined, '']) {
          await expect(
            router.resolve({
              tenantId: T1,
              keyKind,
              keyValue,
              access: ShardAccess.Read,
            }),
          ).rejects.toMatchObject({
            code: ShardingErrorCode.KeyMissing,
          });
        }
      },
    );

    it('does not need keyValue for the tenant key kind', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      await expect(
        env.build().resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
    });

    it('throws UnknownTenant when there is no placement and does not cache the miss', async () => {
      const env = setup();
      const router = env.build({ sharedCache: env.shared });
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.UnknownTenant,
      });
      env.store.setPlacement(placement());
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
    });

    it('throws UnknownShard when the logical shard has no instance', async () => {
      const env = setup();
      env.store.setPlacement(placement({ shardGroup: ['shard-9'] }));
      await expect(
        env.build().resolve({ tenantId: T1, ...READ }),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.UnknownShard,
      });
    });

    it('throws UnknownShard when the shard group is empty', async () => {
      const env = setup();
      env.store.setPlacement(placement({ shardGroup: [] }));
      await expect(
        env.build().resolve({ tenantId: T1, ...READ }),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.UnknownShard,
      });
    });

    it('routes a multi-shard group through the consistent hash ring of the key', async () => {
      const env = setup();
      const group = ['shard-1', 'shard-2', 'shard-3'];
      env.store.setPlacement(placement({ shardGroup: group }));
      const router = env.build();
      const ring = new ConsistentHashRing();
      group.forEach((shard) => ring.add(shard));

      for (let i = 0; i < 200; i++) {
        const resolved = await router.resolve({
          tenantId: T1,
          keyKind: ShardKey.User,
          keyValue: `user-${i}`,
          access: ShardAccess.Read,
        });
        expect(resolved.logicalShard).toBe(ring.locate(`user-${i}`));
        expect(resolved.instance).toBe(`pg-${resolved.logicalShard.slice(-1)}`);
      }
    });

    it('uses the tenantId as routing key for the tenant key kind', async () => {
      const env = setup();
      const group = ['shard-1', 'shard-2', 'shard-3'];
      env.store.setPlacement(placement({ shardGroup: group }));
      const ring = new ConsistentHashRing();
      group.forEach((shard) => ring.add(shard));
      const resolved = await env.build().resolve({
        tenantId: T1,
        keyKind: ShardKey.Tenant,
        keyValue: 'ignored',
        access: ShardAccess.Read,
      });
      expect(resolved.logicalShard).toBe(ring.locate(T1));
    });

    it('lowercases tenant ids and routing keys before use', async () => {
      const env = setup();
      env.store.setPlacement(
        placement({ shardGroup: ['shard-1', 'shard-2', 'shard-3'] }),
      );
      const router = env.build();
      const upper = await router.resolve({
        tenantId: T1.toUpperCase(),
        keyKind: ShardKey.User,
        keyValue: 'USER-Ana',
        access: ShardAccess.Read,
      });
      const lower = await router.resolve({
        tenantId: T1,
        keyKind: ShardKey.User,
        keyValue: 'user-ana',
        access: ShardAccess.Read,
      });
      expect(upper).toEqual(lower);
      expect(upper.tenantId).toBe(T1);
      expect(env.directory.getPlacement).toHaveBeenCalledWith(T1);
    });

    it('throws WrongRegion with the placement region when the tenant lives elsewhere', async () => {
      const env = setup();
      env.store.setPlacement(placement({ region: 'us' }));
      const router = env.build({ currentRegion: 'eu' });
      const error = await errorOf(router.resolve({ tenantId: T1, ...READ }));
      expect(error).toBeInstanceOf(WrongRegionError);
      expect((error as WrongRegionError).code).toBe(
        ShardingErrorCode.WrongRegion,
      );
      expect((error as WrongRegionError).region).toBe('us');
    });

    it('serves tenants of the current region', async () => {
      const env = setup();
      env.store.setPlacement(placement({ region: 'eu' }));
      await expect(
        env.build({ currentRegion: 'eu' }).resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({
        region: 'eu',
      });
    });
  });

  describe('access and status', () => {
    it('allows writes for an Active tenant', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      await expect(
        env.build().resolve({ tenantId: T1, ...WRITE }),
      ).resolves.toMatchObject({ status: TenantStatus.Active });
    });

    it('rejects writes while Migrating and still serves reads', async () => {
      const env = setup();
      env.store.setPlacement(placement({ status: TenantStatus.Migrating }));
      const router = env.build();
      await expect(
        router.resolve({ tenantId: T1, ...WRITE }),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.TenantMigrating,
      });
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({
        status: TenantStatus.Migrating,
      });
    });

    it('rejects writes for an unknown status and still serves reads', async () => {
      const env = setup();
      env.store.setPlacement(placement({ status: 'frozen' as TenantStatus }));
      const router = env.build();
      await expect(
        router.resolve({ tenantId: T1, ...WRITE }),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.TenantNotWritable,
      });
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
    });

    it('assertWritable throws for migrating and unknown statuses and passes for Active', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build();
      const active = await router.resolve({ tenantId: T1, ...READ });
      expect(() => router.assertWritable(active)).not.toThrow();
      expect(() =>
        router.assertWritable({ ...active, status: TenantStatus.Migrating }),
      ).toThrow(
        expect.objectContaining({ code: ShardingErrorCode.TenantMigrating }),
      );
      expect(() =>
        router.assertWritable({ ...active, status: 'frozen' as TenantStatus }),
      ).toThrow(
        expect.objectContaining({ code: ShardingErrorCode.TenantNotWritable }),
      );
    });

    it('rejects writes while a group change is in progress, then allows them once Active', async () => {
      const env = setup();
      env.store.setPlacement(
        placement({ shardGroup: ['shard-1', 'shard-2'], version: 1 }),
      );
      const router = env.build({ sharedCache: env.shared });
      await router.resolve({ tenantId: T1, ...WRITE });

      // Move saga: the group grows to three shards with the tenant Migrating (version 2).
      const group = ['shard-1', 'shard-2', 'shard-3'];
      env.store.setPlacement(
        placement({
          shardGroup: group,
          status: TenantStatus.Migrating,
          version: 2,
        }),
      );
      await router.invalidate(T1);
      await expect(
        router.resolve({ tenantId: T1, ...WRITE }),
      ).rejects.toMatchObject({
        code: ShardingErrorCode.TenantMigrating,
      });
      const duringMove = await router.resolve({ tenantId: T1, ...READ });
      expect(group).toContain(duringMove.logicalShard);

      env.store.setPlacement(placement({ shardGroup: group, version: 3 }));
      await router.invalidate(T1);
      await expect(
        router.resolve({ tenantId: T1, ...WRITE }),
      ).resolves.toMatchObject({ logicalShard: expect.any(String) });
    });

    it('builds a fresh ring when the placement version changes', async () => {
      const env = setup();
      env.store.setPlacement(
        placement({ shardGroup: ['shard-1', 'shard-2'], version: 1 }),
      );
      const router = env.build();
      const keys = Array.from({ length: 200 }, (_, i) => `user-${i}`);
      for (const keyValue of keys) {
        await router.resolve({
          tenantId: T1,
          keyKind: ShardKey.User,
          keyValue,
          access: ShardAccess.Read,
        });
      }

      const group = ['shard-1', 'shard-2', 'shard-3'];
      env.store.setPlacement(placement({ shardGroup: group, version: 2 }));
      await router.invalidate(T1);
      const ring = new ConsistentHashRing();
      group.forEach((shard) => ring.add(shard));
      const shards = new Set<string>();
      for (const keyValue of keys) {
        const resolved = await router.resolve({
          tenantId: T1,
          keyKind: ShardKey.User,
          keyValue,
          access: ShardAccess.Read,
        });
        expect(resolved.logicalShard).toBe(ring.locate(keyValue));
        shards.add(resolved.logicalShard);
      }
      expect(shards.has('shard-3')).toBe(true);
    });
  });

  describe('caching', () => {
    it('checks the in-process cache, then the shared cache, then the directory', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const sharedGet = jest.spyOn(env.shared, 'get');
      const sharedSet = jest.spyOn(env.shared, 'setIfNewer');
      const router = env.build({ sharedCache: env.shared });

      await router.resolve({ tenantId: T1, ...READ });
      expect(sharedGet).toHaveBeenCalledTimes(1);
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);
      // Placements are stored with cache version 2 × version, leaving odd versions for tombstones.
      expect(sharedSet).toHaveBeenCalledWith(
        PLACEMENT_KEY,
        expect.any(String),
        2,
        SHARED_TTL,
      );

      await router.resolve({ tenantId: T1, ...READ });
      expect(sharedGet).toHaveBeenCalledTimes(1);
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);
    });

    it('uses the shared cache before the directory in a fresh router', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      await env
        .build({ sharedCache: env.shared })
        .resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);

      const sharedGet = jest.spyOn(env.shared, 'get');
      await expect(
        env
          .build({ sharedCache: env.shared })
          .resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({
        logicalShard: 'shard-1',
      });
      expect(sharedGet).toHaveBeenCalledTimes(1);
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['corrupted JSON', '{not json'],
      ['a non-object', '["x"]'],
      [
        'a missing version',
        JSON.stringify({
          placement: {
            tenantId: T1,
            region: 'eu',
            shardGroup: ['shard-1'],
            status: 'active',
            dedicated: false,
          },
          expiresAt: FAR_FUTURE,
        }),
      ],
      [
        'an unknown status',
        JSON.stringify({
          placement: {
            tenantId: T1,
            region: 'eu',
            shardGroup: ['shard-1'],
            status: 'frozen',
            version: 1,
            dedicated: false,
          },
          expiresAt: FAR_FUTURE,
        }),
      ],
      [
        'an empty shard group',
        JSON.stringify({
          placement: {
            tenantId: T1,
            region: 'eu',
            shardGroup: [],
            status: 'active',
            version: 1,
            dedicated: false,
          },
          expiresAt: FAR_FUTURE,
        }),
      ],
      [
        'a string version',
        JSON.stringify({
          placement: {
            tenantId: T1,
            region: 'eu',
            shardGroup: ['shard-1'],
            status: 'active',
            version: '1',
            dedicated: false,
          },
          expiresAt: FAR_FUTURE,
        }),
      ],
      [
        'a missing expiry',
        JSON.stringify({
          placement: {
            tenantId: T1,
            region: 'eu',
            shardGroup: ['shard-1'],
            status: 'active',
            version: 1,
            dedicated: false,
          },
        }),
      ],
    ])('treats a shared entry with %s as a miss', async (_label, raw) => {
      const env = setup();
      env.store.setPlacement(placement());
      const cache = new InMemoryRoutingCache(new FixedClock(new Date(0)));
      await cache.setIfNewer(PLACEMENT_KEY, raw, 1, SHARED_TTL);
      await expect(
        env.build({ sharedCache: cache }).resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({
        logicalShard: 'shard-1',
      });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);
    });

    it('caps the local TTL at the remaining TTL of the shared entry', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build({
        sharedCache: env.shared,
        localTtlMs: LOCAL_TTL,
        sharedTtlMs: 30_000,
      });
      await router.resolve({ tenantId: T1, ...READ });

      env.advance(29_999);
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);

      env.advance(1);
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(2);
    });

    it('expires the in-process placement after localTtlMs and refills from the shared cache', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build({ sharedCache: env.shared });
      await router.resolve({ tenantId: T1, ...READ });

      env.advance(LOCAL_TTL - 1);
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);

      env.advance(1);
      const sharedGet = jest.spyOn(env.shared, 'get');
      await router.resolve({ tenantId: T1, ...READ });
      expect(sharedGet).toHaveBeenCalledTimes(1);
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);
    });

    it('goes back to the directory once the shared entry expires', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build({ sharedCache: env.shared });
      await router.resolve({ tenantId: T1, ...READ });

      env.store.setPlacement(
        placement({ shardGroup: ['shard-2'], version: 2 }),
      );
      env.advance(SHARED_TTL);
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-2' });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(2);
    });

    it('caches instances in-process until localTtlMs elapses', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build();
      await router.resolve({ tenantId: T1, ...READ });
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getInstance).toHaveBeenCalledTimes(1);

      env.store.setInstance('shard-1', 'pg-moved');
      env.advance(LOCAL_TTL);
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ instance: 'pg-moved' });
      expect(env.directory.getInstance).toHaveBeenCalledTimes(2);
    });

    it('honours custom TTLs', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build({
        sharedCache: env.shared,
        localTtlMs: 10,
        sharedTtlMs: 20,
      });
      await router.resolve({ tenantId: T1, ...READ });

      env.advance(10);
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);

      env.advance(10);
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(2);

      env.advance(10);
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache outage', () => {
    it('falls back to the directory and reports every failing call', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const onCacheError = jest.fn();
      const router = env.build({ sharedCache: failingCache, onCacheError });

      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
      expect(onCacheError).toHaveBeenCalledTimes(2); // get and setIfNewer

      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);

      await expect(router.invalidate(T1)).resolves.toBeUndefined();
      expect(onCacheError).toHaveBeenCalledTimes(4); // get and the tombstone setIfNewer
    });

    it('works without an error handler', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build({ sharedCache: failingCache });
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
    });
  });

  describe('single flight and invalidation race', () => {
    it('shares one directory read between concurrent misses', async () => {
      const env = setup();
      const pending = deferred<TenantPlacement | undefined>();
      env.directory.getPlacement.mockImplementationOnce(() => pending.promise);
      const router = env.build({ sharedCache: env.shared });

      const first = router.resolve({ tenantId: T1, ...READ });
      const second = router.resolve({ tenantId: T1, ...READ });
      await flush();
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);

      pending.resolve(placement());
      await expect(Promise.all([first, second])).resolves.toEqual([
        expect.objectContaining({ logicalShard: 'shard-1' }),
        expect.objectContaining({ logicalShard: 'shard-1' }),
      ]);
    });

    it('does not cache a load that was overtaken by an invalidation', async () => {
      const env = setup();
      const stale = deferred<TenantPlacement | undefined>();
      const fresh = deferred<TenantPlacement | undefined>();
      env.directory.getPlacement
        .mockImplementationOnce(() => stale.promise)
        .mockImplementationOnce(() => fresh.promise);
      const setSpy = jest.spyOn(env.shared, 'setIfNewer');
      const router = env.build({ sharedCache: env.shared });

      const old = router.resolve({ tenantId: T1, ...READ });
      await flush();
      await router.invalidate(T1);
      const next = router.resolve({ tenantId: T1, ...READ });
      await flush();
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(2);

      const placementWrites = () =>
        setSpy.mock.calls.filter(([, value]) => value.includes('"placement"'));

      // The read started before the invalidation returns its answer but writes nothing.
      stale.resolve(placement({ shardGroup: ['shard-1'], version: 1 }));
      await expect(old).resolves.toMatchObject({ logicalShard: 'shard-1' });
      expect(placementWrites()).toHaveLength(0);

      fresh.resolve(placement({ shardGroup: ['shard-2'], version: 2 }));
      await expect(next).resolves.toMatchObject({ logicalShard: 'shard-2' });
      expect(placementWrites()).toHaveLength(1);
      expect(placementWrites()[0]?.[1]).toContain('"shard-2"');

      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-2' });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(2);
    });

    // Reproduces audit finding P1.7: invalidate used to delete the key and the read wrote it back.
    it('does not let a read in flight in another process resurrect an invalidated placement', async () => {
      const env = setup();
      env.store.setPlacement(
        placement({ shardGroup: ['shard-1'], version: 1 }),
      );
      const stale = deferred<TenantPlacement | undefined>();
      env.directory.getPlacement.mockImplementationOnce(() => stale.promise);
      const reader = env.build({ sharedCache: env.shared });
      const mover = env.build({ sharedCache: env.shared });

      // 1. Process A starts a read and reaches the directory (version 1).
      const inFlight = reader.resolve({ tenantId: T1, ...READ });
      await flush();
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);

      // 2. The move commits version 2 and process B invalidates.
      env.store.setPlacement(
        placement({ shardGroup: ['shard-2'], version: 2 }),
      );
      await mover.invalidate(T1);

      // 3. Process A's read answers with version 1 and tries to write it back.
      stale.resolve(placement({ shardGroup: ['shard-1'], version: 1 }));
      await expect(inFlight).resolves.toMatchObject({
        logicalShard: 'shard-1',
      });

      // A fresh process must not see the old placement in the shared cache.
      await expect(
        env
          .build({ sharedCache: env.shared })
          .resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-2' });
    });

    it('does not cache an instance that was overtaken by invalidateShard', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const pending = deferred<string | undefined>();
      env.directory.getInstance.mockImplementationOnce(() => pending.promise);
      const router = env.build();

      const first = router.resolve({ tenantId: T1, ...READ });
      await flush();
      router.invalidateShard('shard-1');
      pending.resolve('pg-old');
      await expect(first).resolves.toMatchObject({ instance: 'pg-old' });

      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ instance: 'pg-1' });
      expect(env.directory.getInstance).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidation', () => {
    it('clears the in-process cache and tombstones the shared entry so the next resolve reads the directory', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const sharedDelete = jest.spyOn(env.shared, 'delete');
      const router = env.build({ sharedCache: env.shared });
      await router.resolve({ tenantId: T1, ...READ });

      env.store.setPlacement(
        placement({ shardGroup: ['shard-2'], version: 2 }),
      );
      await router.invalidate(T1);

      expect(sharedDelete).not.toHaveBeenCalled();
      expect(decodeSharedRecord(await env.shared.get(PLACEMENT_KEY))).toEqual({
        kind: 'tombstone',
        tombstone: { cacheVersion: 3, expiresAt: TOMBSTONE_TTL },
      });
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({
        logicalShard: 'shard-2',
        instance: 'pg-2',
      });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(2);
    });

    it('drops the cached instances of the group', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build();
      await router.resolve({ tenantId: T1, ...READ });

      env.store.setInstance('shard-1', 'pg-new');
      await router.invalidate(T1);
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ instance: 'pg-new' });
    });

    it('clears the group from the shared cache when the local placement already expired', async () => {
      const env = setup();
      env.store.setPlacement(placement({ tenantId: T1 }));
      env.store.setPlacement(placement({ tenantId: T2 }));
      const router = env.build({ sharedCache: env.shared });

      await router.resolve({ tenantId: T1, ...READ }); // t=0: t1 placement and shard-1 instance cached
      env.advance(50_000);
      await router.resolve({ tenantId: T2, ...READ }); // t=50: refreshes the shard-1 instance until t=110
      env.advance(11_000); // t=61: t1 placement expired locally, its shared entry still valid

      env.store.setInstance('shard-1', 'pg-new');
      await router.invalidate(T1);
      await expect(
        router.resolve({ tenantId: T2, ...READ }),
      ).resolves.toMatchObject({ instance: 'pg-new' });
    });

    it('works for unknown tenants without a shared cache', async () => {
      const env = setup();
      await expect(env.build().invalidate(T3)).resolves.toBeUndefined();
    });

    it('invalidateShard clears the instance whatever placements reference it', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build();
      await router.resolve({ tenantId: T1, ...READ });

      env.store.setInstance('shard-1', 'pg-new');
      router.invalidateShard('shard-1');
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ instance: 'pg-new' });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);
      expect(env.directory.getInstance).toHaveBeenCalledTimes(2);
    });
  });

  // Audit PLAT-13: other processes kept the old placement for up to localTtlMs after a move.
  describe('directory changes across processes', () => {
    it('drops the placement in every listening process when one of them invalidates', async () => {
      const env = setup();
      env.store.setPlacement(
        placement({ shardGroup: ['shard-1'], version: 1 }),
      );
      const channel = new InMemoryShardDirectoryChannel();
      const mover = env.build({ sharedCache: env.shared, changes: channel });
      const other = env.build({ sharedCache: env.shared });
      await other.listen(channel);
      await other.resolve({ tenantId: T1, ...READ });

      env.store.setPlacement(
        placement({ shardGroup: ['shard-2'], version: 2 }),
      );
      await mover.invalidate(T1, { version: 2 });

      await expect(
        other.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-2' });
    });

    it('ignores older placements from the shared cache and a lagging directory after a change', async () => {
      const env = setup();
      const router = env.build({ sharedCache: env.shared });
      // The shared cache still holds version 1 (the publisher could not write its tombstone).
      env.store.setPlacement(
        placement({ shardGroup: ['shard-1'], version: 1 }),
      );
      await router.resolve({ tenantId: T1, ...READ });

      router.applyDirectoryChange({
        type: ShardingEvent.ShardDirectoryChanged,
        kind: ShardDirectoryChangeKind.TenantPlacement,
        tenantId: T1,
        version: 2,
      });
      // The replica has not caught up yet: answered, but not cached.
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(2);

      env.store.setPlacement(
        placement({ shardGroup: ['shard-2'], version: 2 }),
      );
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-2' });
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(3);
    });

    it('keeps a placement that is already at the announced version', async () => {
      const env = setup();
      env.store.setPlacement(placement({ version: 3 }));
      const router = env.build();
      await router.resolve({ tenantId: T1, ...READ });
      router.applyDirectoryChange({
        type: ShardingEvent.ShardDirectoryChanged,
        kind: ShardDirectoryChangeKind.TenantPlacement,
        tenantId: T1,
        version: 3,
      });
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);
    });

    it('drops a moved shard instance', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build();
      await router.resolve({ tenantId: T1, ...READ });
      env.store.setInstance('shard-1', 'pg-new');
      router.applyDirectoryChange({
        type: ShardingEvent.ShardDirectoryChanged,
        kind: ShardDirectoryChangeKind.ShardInstance,
        logicalShard: 'shard-1',
      });
      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ instance: 'pg-new' });
    });

    it('reports a malformed change and a failing publisher without throwing', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const onCacheError = jest.fn();
      const router = env.build({
        onCacheError,
        changes: {
          publish: () => Promise.reject(new Error('channel down')),
        },
      });
      router.applyDirectoryChange({
        type: ShardingEvent.ShardDirectoryChanged,
        kind: ShardDirectoryChangeKind.TenantPlacement,
        tenantId: 'not-a-uuid',
      });
      await expect(router.invalidate(T1)).resolves.toBeUndefined();
      expect(onCacheError).toHaveBeenCalledTimes(2);
    });
  });

  describe('versioned tombstones', () => {
    const tombstoneOf = async (cache: RoutingCache) => {
      const record = decodeSharedRecord(await cache.get(PLACEMENT_KEY));
      return record?.kind === 'tombstone' ? record.tombstone : undefined;
    };

    it('lets the committed version be cached right away when the caller passes it', async () => {
      const env = setup();
      env.store.setPlacement(placement({ version: 1 }));
      const router = env.build({ sharedCache: env.shared });
      await router.resolve({ tenantId: T1, ...READ });

      env.store.setPlacement(
        placement({ shardGroup: ['shard-2'], version: 4 }),
      );
      await router.invalidate(T1, { version: 4 });
      expect((await tombstoneOf(env.shared))?.cacheVersion).toBe(7);

      await router.resolve({ tenantId: T1, ...READ });
      const fresh = env.build({ sharedCache: env.shared });
      await expect(
        fresh.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-2' });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(2);
    });

    it('refuses the stale version even when the caller passes the committed version', async () => {
      const env = setup();
      const stale = deferred<TenantPlacement | undefined>();
      env.directory.getPlacement.mockImplementationOnce(() => stale.promise);
      const reader = env.build({ sharedCache: env.shared });
      const mover = env.build({ sharedCache: env.shared });

      const inFlight = reader.resolve({ tenantId: T1, ...READ });
      await flush();
      env.store.setPlacement(
        placement({ shardGroup: ['shard-2'], version: 2 }),
      );
      await mover.invalidate(T1, { version: 2 });
      stale.resolve(placement({ version: 1 }));
      await inFlight;

      expect(await tombstoneOf(env.shared)).toEqual({
        cacheVersion: 3,
        expiresAt: TOMBSTONE_TTL,
      });
    });

    it('blocks every write until it expires when no version is known', async () => {
      const env = setup();
      const router = env.build({ sharedCache: env.shared });
      await router.invalidate(T1);
      expect((await tombstoneOf(env.shared))?.cacheVersion).toBe(
        UNVERSIONED_TOMBSTONE_VERSION,
      );

      env.store.setPlacement(placement({ version: 9 }));
      await router.resolve({ tenantId: T1, ...READ });
      expect(await tombstoneOf(env.shared)).toBeDefined();

      env.advance(TOMBSTONE_TTL);
      await env
        .build({ sharedCache: env.shared })
        .resolve({ tenantId: T1, ...READ });
      expect(await tombstoneOf(env.shared)).toBeUndefined();
      expect(
        decodeSharedRecord(await env.shared.get(PLACEMENT_KEY)),
      ).toMatchObject({ kind: 'placement' });
    });

    it('outranks an earlier tombstone so a second invalidation refreshes it', async () => {
      const env = setup();
      const router = env.build({
        sharedCache: env.shared,
        tombstoneTtlMs: 1_000,
      });
      await router.invalidate(T1);
      env.advance(600);
      await router.invalidate(T1);
      expect(await tombstoneOf(env.shared)).toEqual({
        cacheVersion: UNVERSIONED_TOMBSTONE_VERSION + 1,
        expiresAt: 1_600,
      });
    });

    it('treats a tombstone as a miss and reads the directory', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      await env.build({ sharedCache: env.shared }).invalidate(T1);
      await expect(
        env
          .build({ sharedCache: env.shared })
          .resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);
    });

    it('does not write a load that outlived the tombstone TTL', async () => {
      const env = setup();
      const slow = deferred<TenantPlacement | undefined>();
      env.directory.getPlacement.mockImplementationOnce(() => slow.promise);
      const setSpy = jest.spyOn(env.shared, 'setIfNewer');
      const reader = env.build({
        sharedCache: env.shared,
        tombstoneTtlMs: 1_000,
      });

      const inFlight = reader.resolve({ tenantId: T1, ...READ });
      await flush();
      env.advance(1_000);
      slow.resolve(placement());
      await expect(inFlight).resolves.toMatchObject({
        logicalShard: 'shard-1',
      });
      expect(setSpy).not.toHaveBeenCalled();
    });
  });

  describe('input limits', () => {
    it.each([
      ['not a UUID', 'tenant-1'],
      ['a UUIDv4', '0b8f4f8e-3f5c-4c1a-9f2d-1a2b3c4d5e6f'],
      ['too long', 'a'.repeat(MAX_TENANT_ID_LENGTH + 1)],
    ])(
      'rejects a tenant id that is %s without touching the caches',
      async (_label, tenantId) => {
        const env = setup();
        const sharedGet = jest.spyOn(env.shared, 'get');
        const router = env.build({ sharedCache: env.shared });
        const error = await errorOf(router.resolve({ tenantId, ...READ }));
        expect(error).toMatchObject({
          code: ShardingErrorCode.InvalidTenantId,
          details: { length: tenantId.length },
        });
        expect((error as Error).message).not.toContain(tenantId);
        expect(sharedGet).not.toHaveBeenCalled();
        expect(env.directory.getPlacement).not.toHaveBeenCalled();
        await expect(router.invalidate(tenantId)).rejects.toMatchObject({
          code: ShardingErrorCode.InvalidTenantId,
        });
      },
    );

    it('rejects a missing tenant id in invalidate', async () => {
      await expect(setup().build().invalidate('')).rejects.toMatchObject({
        code: ShardingErrorCode.KeyMissing,
      });
    });

    it('accepts another tenant id format through tenantIdPattern', async () => {
      const env = setup();
      env.store.setPlacement(placement({ tenantId: 'acme' }));
      const router = env.build({ tenantIdPattern: /^[a-z]+$/i });
      await expect(
        router.resolve({ tenantId: 'ACME', ...READ }),
      ).resolves.toMatchObject({ tenantId: 'acme' });
    });

    it('refuses a stateful tenantIdPattern', () => {
      expect(() => setup().build({ tenantIdPattern: /^[a-z]+$/g })).toThrow(
        expect.objectContaining({
          code: ShardingErrorCode.InvalidConfiguration,
        }),
      );
    });

    it('accepts a routing key of maxKeyLength and rejects a longer one', async () => {
      const env = setup();
      env.store.setPlacement(placement({ shardGroup: ['shard-1', 'shard-2'] }));
      const router = env.build({ maxKeyLength: 8 });
      const request = (keyValue: string) =>
        router.resolve({
          tenantId: T1,
          keyKind: ShardKey.User,
          keyValue,
          access: ShardAccess.Read,
        });
      await expect(request('a'.repeat(8))).resolves.toBeDefined();
      const error = await errorOf(request('secret-value'));
      expect(error).toMatchObject({
        code: ShardingErrorCode.InvalidKey,
        details: { keyKind: ShardKey.User, length: 12, maxLength: 8 },
      });
      expect((error as Error).message).not.toContain('secret-value');
    });

    it('rejects a key that only grows past the limit once lowercased', async () => {
      const env = setup();
      env.store.setPlacement(placement({ shardGroup: ['shard-1', 'shard-2'] }));
      const router = env.build({ maxKeyLength: 1 });
      // U+0130 lowercases to two code units.
      await expect(
        router.resolve({
          tenantId: T1,
          keyKind: ShardKey.Custom,
          keyValue: 'İ',
          access: ShardAccess.Read,
        }),
      ).rejects.toMatchObject({ code: ShardingErrorCode.InvalidKey });
    });

    it.each([
      ['maxPlacements', { maxPlacements: 0 }],
      ['maxInstances', { maxInstances: 1.5 }],
      ['maxKeyLength', { maxKeyLength: -1 }],
      ['localTtlMs', { localTtlMs: Number.NaN }],
      ['sharedTtlMs', { sharedTtlMs: -1 }],
      ['tombstoneTtlMs', { tombstoneTtlMs: 0 }],
    ])('rejects an invalid %s', (option, options) => {
      expect(() => setup().build(options)).toThrow(
        expect.objectContaining({
          code: ShardingErrorCode.InvalidConfiguration,
          details: { option },
        }),
      );
    });

    it.each([-1, 1.5])(
      'rejects an invalidate version of %s',
      async (version) => {
        await expect(
          setup().build().invalidate(T1, { version }),
        ).rejects.toMatchObject({
          code: ShardingErrorCode.InvalidConfiguration,
          details: { option: 'version' },
        });
      },
    );
  });

  describe('bounded memory', () => {
    it('evicts the least recently used placement past maxPlacements', async () => {
      const env = setup();
      env.store.setPlacement(placement({ tenantId: T1 }));
      env.store.setPlacement(placement({ tenantId: T2 }));
      const router = env.build({ maxPlacements: 1 });

      await router.resolve({ tenantId: T1, ...READ });
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);

      await router.resolve({ tenantId: T2, ...READ });
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(3);
    });

    it('evicts the least recently used instance past maxInstances', async () => {
      const env = setup();
      env.store.setPlacement(
        placement({ tenantId: T1, shardGroup: ['shard-1'] }),
      );
      env.store.setPlacement(
        placement({ tenantId: T2, shardGroup: ['shard-2'] }),
      );
      const router = env.build({ maxInstances: 1 });

      await router.resolve({ tenantId: T1, ...READ });
      await router.resolve({ tenantId: T2, ...READ });
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getInstance).toHaveBeenCalledTimes(3);
    });

    it('still refuses to cache a load whose invalidation record was evicted', async () => {
      const env = setup();
      const stale = deferred<TenantPlacement | undefined>();
      env.directory.getPlacement.mockImplementationOnce(() => stale.promise);
      env.store.setPlacement(placement({ tenantId: T1, version: 2 }));
      const router = env.build({ maxPlacements: 1 });

      const old = router.resolve({ tenantId: T1, ...READ });
      await flush();
      await router.invalidate(T1);
      await router.invalidate(T2); // evicts the record of T1
      stale.resolve(placement({ tenantId: T1, shardGroup: ['shard-9'] }));
      await old.catch(() => undefined);

      await expect(
        router.resolve({ tenantId: T1, ...READ }),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(2);
    });

    it('loads without single flight once maxPlacements loads are in flight', async () => {
      const env = setup();
      env.store.setPlacement(placement({ tenantId: T1 }));
      env.store.setPlacement(placement({ tenantId: T2 }));
      const first = deferred<TenantPlacement | undefined>();
      env.directory.getPlacement.mockImplementationOnce(() => first.promise);
      const router = env.build({ maxPlacements: 1 });

      const t1 = router.resolve({ tenantId: T1, ...READ });
      await flush();
      const t2a = router.resolve({ tenantId: T2, ...READ });
      const t2b = router.resolve({ tenantId: T2, ...READ });
      await expect(Promise.all([t2a, t2b])).resolves.toHaveLength(2);
      first.resolve(placement({ tenantId: T1 }));
      await expect(t1).resolves.toMatchObject({ tenantId: T1 });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(3);
    });
  });

  describe('deadline and cancellation', () => {
    it('fails with DeadlineExceededError before any lookup when the deadline already passed', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const deadline = Deadline.after(0, new FixedClock());
      await expect(
        env.build().resolve({ tenantId: T1, ...READ, deadline }),
      ).rejects.toBeInstanceOf(DeadlineExceededError);
      expect(env.directory.getPlacement).not.toHaveBeenCalled();
    });

    it('fails with the abort reason before any lookup when the signal is aborted', async () => {
      const env = setup();
      const reason = new Error('request closed');
      await expect(
        env.build().resolve({
          tenantId: T1,
          ...READ,
          signal: AbortSignal.abort(reason),
        }),
      ).rejects.toBe(reason);
      expect(env.directory.getPlacement).not.toHaveBeenCalled();
    });

    it('releases an aborted caller while the shared load still serves and caches for the others', async () => {
      const env = setup();
      const pending = deferred<TenantPlacement | undefined>();
      env.directory.getPlacement.mockImplementationOnce(() => pending.promise);
      const router = env.build({ sharedCache: env.shared });
      const controller = new AbortController();

      const aborted = router.resolve({
        tenantId: T1,
        ...READ,
        signal: controller.signal,
      });
      const patient = router.resolve({ tenantId: T1, ...READ });
      await flush();
      const reason = new Error('client went away');
      controller.abort(reason);
      await expect(aborted).rejects.toBe(reason);

      pending.resolve(placement());
      await expect(patient).resolves.toMatchObject({ logicalShard: 'shard-1' });
      await router.resolve({ tenantId: T1, ...READ });
      expect(env.directory.getPlacement).toHaveBeenCalledTimes(1);
    });

    it('fails with DeadlineExceededError when the directory is slower than the deadline', async () => {
      const env = setup();
      env.directory.getPlacement.mockImplementationOnce(
        () => new Promise(() => undefined),
      );
      const deadline = Deadline.after(5, new FixedClock());
      await expect(
        env.build().resolve({ tenantId: T1, ...READ, deadline }),
      ).rejects.toBeInstanceOf(DeadlineExceededError);
    });

    it('bounds the instance lookup too', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      env.directory.getInstance.mockImplementationOnce(
        () => new Promise(() => undefined),
      );
      const controller = new AbortController();
      const resolving = env
        .build()
        .resolve({ tenantId: T1, ...READ, signal: controller.signal });
      await flush();
      expect(env.directory.getInstance).toHaveBeenCalledTimes(1);
      controller.abort(new Error('stop'));
      await expect(resolving).rejects.toThrow('stop');
    });

    it('arms no timer when both lookups hit the in-process cache', async () => {
      const env = setup();
      env.store.setPlacement(placement());
      const router = env.build();
      await router.resolve({ tenantId: T1, ...READ });

      const timer = jest.spyOn(globalThis, 'setTimeout');
      const deadline = Deadline.after(60_000, new FixedClock());
      await expect(
        router.resolve({ tenantId: T1, ...READ, deadline }),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
      expect(timer).not.toHaveBeenCalled();
      timer.mockRestore();
    });
  });
});
