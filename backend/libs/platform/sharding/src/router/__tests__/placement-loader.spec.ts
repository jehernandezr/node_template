import { FixedClock } from '@platform/kernel/test-utils';
import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import {
  CountingDirectoryStore,
  InMemoryRoutingCache,
  PlacementBuilder,
  TestTenants,
} from '../../__tests__/utils/index.js';
import type { RoutingCache } from '../../ports/routing-cache.js';
import { InvalidationLog } from '../invalidation-log.js';
import { PlacementCache } from '../placement-cache.js';
import { PlacementCodec } from '../placement-codec.js';
import { PlacementLoader } from '../placement-loader.js';

const LOCAL_TTL_MS = 60_000;
const SHARED_TTL_MS = 300_000;
const TOMBSTONE_TTL_MS = 30_000;
const ID = TestTenants.One;
const KEY = PlacementCache.KEY_PREFIX + ID;

describe('PlacementLoader', () => {
  let clock: FixedClock;
  let directory: CountingDirectoryStore;
  let errors: unknown[];

  beforeEach(() => {
    clock = new FixedClock();
    errors = [];
    directory = new CountingDirectoryStore();
    directory.setPlacement(PlacementBuilder.aPlacement().build());
    directory.setPlacement(
      PlacementBuilder.aPlacement().withTenantId(TestTenants.Two).build(),
    );
  });

  function build(sharedCache: RoutingCache | undefined, maxInFlight = 100) {
    const invalidations = new InvalidationLog(100);
    const cache = new PlacementCache(
      {
        localTtlMs: LOCAL_TTL_MS,
        sharedTtlMs: SHARED_TTL_MS,
        tombstoneTtlMs: TOMBSTONE_TTL_MS,
        maxPlacements: 100,
      },
      clock,
      sharedCache,
      (error) => errors.push(error),
    );
    const loader = new PlacementLoader(
      directory,
      cache,
      invalidations,
      clock,
      maxInFlight,
    );
    return { cache, invalidations, loader };
  }

  describe('single flight', () => {
    it('shares one directory read between one hundred concurrent loads of a tenant', async () => {
      const { loader } = build(undefined);
      const release = directory.hold();

      const loads = Array.from({ length: 100 }, () => loader.loadOrJoin(ID));
      release();
      await Promise.all(loads);

      expect(directory.placementReads).toBe(1);
    });

    it('reads the directory once per distinct tenant', async () => {
      const { loader } = build(undefined);

      await Promise.all([
        loader.loadOrJoin(ID),
        loader.loadOrJoin(TestTenants.Two),
      ]);

      expect(directory.placementReads).toBe(2);
    });

    it('does not cache a load whose tenant was invalidated after it started', async () => {
      const { cache, invalidations, loader } = build(undefined);
      const release = directory.hold();

      const loading = loader.loadOrJoin(ID);
      invalidations.mark(ID);
      release();
      await loading;

      expect(cache.local(ID)).toBeUndefined();
    });

    it('does not join a load that started before an invalidation', async () => {
      const { invalidations, loader } = build(undefined);
      const release = directory.hold();

      const stale = loader.loadOrJoin(ID);
      invalidations.mark(ID);
      const fresh = loader.loadOrJoin(ID);
      release();
      await Promise.all([stale, fresh]);

      expect(directory.placementReads).toBe(2);
    });

    it('does not run a single flight beyond maxInFlight', async () => {
      const { loader } = build(undefined, 1);
      const release = directory.hold();

      const first = loader.loadOrJoin(ID);
      const second = loader.loadOrJoin(TestTenants.Two);
      const third = loader.loadOrJoin(TestTenants.Two);
      release();
      await Promise.all([first, second, third]);

      expect(directory.placementReads).toBe(3);
    });
  });

  describe('reads', () => {
    it('rejects with UnknownTenant when the directory lacks the tenant', async () => {
      const { loader } = build(undefined);

      await expect(loader.loadOrJoin(TestTenants.Three)).rejects.toMatchObject({
        code: ShardingErrorCode.UnknownTenant,
        details: { tenantId: TestTenants.Three },
      });
    });

    it('reads a shared placement without touching the directory', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      const placement = PlacementBuilder.aPlacement().build();
      await sharedCache.setIfNewer(
        KEY,
        PlacementCodec.encodeEntry({
          placement,
          expiresAt: clock.now().getTime() + 60_000,
        }),
        PlacementCodec.cacheVersion(placement.version),
        60_000,
      );
      const { loader } = build(sharedCache);

      await expect(loader.loadOrJoin(ID)).resolves.toEqual(placement);
      expect(directory.placementReads).toBe(0);
    });

    it('falls back to the directory when the shared placement has expired', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      const placement = PlacementBuilder.aPlacement().build();
      await sharedCache.setIfNewer(
        KEY,
        PlacementCodec.encodeEntry({
          placement,
          expiresAt: clock.now().getTime() - 1,
        }),
        PlacementCodec.cacheVersion(placement.version),
        SHARED_TTL_MS,
      );
      const { loader } = build(sharedCache);

      await loader.loadOrJoin(ID);

      expect(directory.placementReads).toBe(1);
    });

    it('falls back to the directory when the shared placement is outdated', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      const stored = PlacementBuilder.aPlacement().withVersion(4).build();
      await sharedCache.setIfNewer(
        KEY,
        PlacementCodec.encodeEntry({
          placement: stored,
          expiresAt: clock.now().getTime() + SHARED_TTL_MS,
        }),
        PlacementCodec.cacheVersion(stored.version),
        SHARED_TTL_MS,
      );
      directory.setPlacement(
        PlacementBuilder.aPlacement().withVersion(5).build(),
      );
      const { cache, loader } = build(sharedCache);
      cache.raiseMinVersion(ID, 5);

      await expect(loader.loadOrJoin(ID)).resolves.toMatchObject({
        version: 5,
      });
      expect(directory.placementReads).toBe(1);
    });

    it('writes a load that finished within the tombstone TTL to the shared cache', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      const { loader } = build(sharedCache);

      await loader.loadOrJoin(ID);

      expect(await sharedCache.get(KEY)).toBeDefined();
    });

    it('does not write a load that outlived the tombstone TTL to the shared cache', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      const { loader } = build(sharedCache);
      const release = directory.hold();

      const loading = loader.loadOrJoin(ID);
      clock.advance(TOMBSTONE_TTL_MS);
      release();
      await loading;

      expect(await sharedCache.get(KEY)).toBeUndefined();
    });
  });
});
