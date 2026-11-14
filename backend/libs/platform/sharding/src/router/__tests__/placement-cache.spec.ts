import { FixedClock } from '@platform/kernel/test-utils';
import {
  FailingRoutingCache,
  InMemoryRoutingCache,
  PlacementBuilder,
  TestTenants,
} from '../../__tests__/utils/index.js';
import type { RoutingCache } from '../../ports/routing-cache.js';
import { PlacementCache } from '../placement-cache.js';
import { SharedRecordKind } from '../shared-record-kind.enum.js';

const LOCAL_TTL_MS = 60_000;
const SHARED_TTL_MS = 300_000;
const TOMBSTONE_TTL_MS = 30_000;
const ID = TestTenants.One;
const KEY = PlacementCache.KEY_PREFIX + ID;

describe('PlacementCache', () => {
  let clock: FixedClock;
  let errors: unknown[];

  beforeEach(() => {
    clock = new FixedClock();
    errors = [];
  });

  function cacheWith(
    sharedCache: RoutingCache | undefined,
    maxPlacements = 10,
  ): PlacementCache {
    return new PlacementCache(
      {
        localTtlMs: LOCAL_TTL_MS,
        sharedTtlMs: SHARED_TTL_MS,
        tombstoneTtlMs: TOMBSTONE_TTL_MS,
        maxPlacements,
      },
      clock,
      sharedCache,
      (error) => errors.push(error),
    );
  }

  describe('local entries', () => {
    it('keeps a remembered placement for localTtlMs', () => {
      const cache = cacheWith(undefined);
      const placement = PlacementBuilder.aPlacement().build();
      cache.remember(ID, placement, Number.POSITIVE_INFINITY);

      clock.advance(LOCAL_TTL_MS - 1);
      expect(cache.local(ID)).toEqual(placement);

      clock.advance(1);
      expect(cache.local(ID)).toBeUndefined();
    });

    it('never keeps a placement past its shared expiry', () => {
      const cache = cacheWith(undefined);
      const placement = PlacementBuilder.aPlacement().build();
      cache.remember(ID, placement, clock.now().getTime() + 1_000);

      clock.advance(1_000);

      expect(cache.local(ID)).toBeUndefined();
    });

    it('drop removes the placement', () => {
      const cache = cacheWith(undefined);
      cache.remember(
        ID,
        PlacementBuilder.aPlacement().build(),
        Number.POSITIVE_INFINITY,
      );

      cache.drop(ID);

      expect(cache.local(ID)).toBeUndefined();
    });

    it('evicts the least recently used tenant beyond maxPlacements', () => {
      const cache = cacheWith(undefined, 1);
      const second = PlacementBuilder.aPlacement()
        .withTenantId(TestTenants.Two)
        .build();
      cache.remember(
        ID,
        PlacementBuilder.aPlacement().build(),
        Number.POSITIVE_INFINITY,
      );
      cache.remember(TestTenants.Two, second, Number.POSITIVE_INFINITY);

      expect(cache.local(ID)).toBeUndefined();
      expect(cache.local(TestTenants.Two)).toEqual(second);
    });
  });

  describe('shared cache', () => {
    it('reports the shared expiry from now when a shared cache exists', () => {
      const cache = cacheWith(new InMemoryRoutingCache(clock));

      expect(cache.sharedExpiry()).toBe(clock.now().getTime() + SHARED_TTL_MS);
    });

    it('writes a placement that readShared returns', async () => {
      const cache = cacheWith(new InMemoryRoutingCache(clock));
      const placement = PlacementBuilder.aPlacement().withVersion(2).build();
      const expiresAt = cache.sharedExpiry();

      await cache.writeShared(placement, expiresAt, clock.now().getTime());

      expect(await cache.readShared(ID)).toEqual({
        kind: SharedRecordKind.Placement,
        entry: { placement, expiresAt },
      });
    });

    it('answers no record and writes nothing without a shared cache', async () => {
      const cache = cacheWith(undefined);
      const placement = PlacementBuilder.aPlacement().build();

      expect(cache.sharedExpiry()).toBe(Number.POSITIVE_INFINITY);
      await expect(cache.readShared(ID)).resolves.toBeUndefined();
      await expect(
        cache.writeShared(placement, 1, clock.now().getTime()),
      ).resolves.toBeUndefined();
      await expect(cache.writeTombstone(ID, 5)).resolves.toBeUndefined();
      expect(errors).toEqual([]);
    });

    it.each([
      [TOMBSTONE_TTL_MS - 1, true],
      [TOMBSTONE_TTL_MS, false],
    ])('a load that started %i ms ago is stored: %s', async (ageMs, stored) => {
      const sharedCache = new InMemoryRoutingCache(clock);
      const cache = cacheWith(sharedCache);
      const startedAt = clock.now().getTime() - ageMs;

      await cache.writeShared(
        PlacementBuilder.aPlacement().build(),
        cache.sharedExpiry(),
        startedAt,
      );

      expect((await sharedCache.get(KEY)) !== undefined).toBe(stored);
    });

    it('writeTombstone leaves a tombstone that readShared returns', async () => {
      const cache = cacheWith(new InMemoryRoutingCache(clock));

      await cache.writeTombstone(ID, 11);

      expect(await cache.readShared(ID)).toEqual({
        kind: SharedRecordKind.Tombstone,
        tombstone: {
          cacheVersion: 11,
          expiresAt: clock.now().getTime() + TOMBSTONE_TTL_MS,
        },
      });
    });

    it('a tombstone refuses an older placement written afterwards', async () => {
      const cache = cacheWith(new InMemoryRoutingCache(clock));
      await cache.writeTombstone(ID, 11);

      await cache.writeShared(
        PlacementBuilder.aPlacement().withVersion(4).build(),
        cache.sharedExpiry(),
        clock.now().getTime(),
      );

      expect((await cache.readShared(ID))?.kind).toBe(
        SharedRecordKind.Tombstone,
      );
    });

    it('treats a malformed shared value as a miss', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      await sharedCache.setIfNewer(KEY, 'not json', 1, SHARED_TTL_MS);
      const cache = cacheWith(sharedCache);

      await expect(cache.readShared(ID)).resolves.toBeUndefined();
      expect(errors).toEqual([]);
    });

    it('reports a failing shared read to onError and answers a miss', async () => {
      const failing = new FailingRoutingCache();
      failing.failReads = true;
      const cache = cacheWith(failing);

      await expect(cache.readShared(ID)).resolves.toBeUndefined();
      expect(errors).toEqual([new Error('shared cache is down')]);
    });

    it('reports failing shared writes to onError without throwing', async () => {
      const failing = new FailingRoutingCache();
      failing.failWrites = true;
      const cache = cacheWith(failing);
      const placement = PlacementBuilder.aPlacement().build();

      await expect(
        cache.writeShared(
          placement,
          cache.sharedExpiry(),
          clock.now().getTime(),
        ),
      ).resolves.toBeUndefined();
      await expect(cache.writeTombstone(ID, 5)).resolves.toBeUndefined();
      expect(errors).toEqual([
        new Error('shared cache is down'),
        new Error('shared cache is down'),
      ]);
    });
  });

  describe('minimum versions', () => {
    it('raiseMinVersion only goes up', () => {
      const cache = cacheWith(undefined);

      cache.raiseMinVersion(ID, 5);
      cache.raiseMinVersion(ID, 3);

      expect(cache.isOutdated(ID, 4)).toBe(true);
      expect(cache.isOutdated(ID, 5)).toBe(false);
    });

    it('remembering a placement that meets the minimum clears it', () => {
      const cache = cacheWith(undefined);
      cache.raiseMinVersion(ID, 5);
      expect(cache.isOutdated(ID, 4)).toBe(true);

      cache.remember(
        ID,
        PlacementBuilder.aPlacement().withVersion(5).build(),
        Number.POSITIVE_INFINITY,
      );

      expect(cache.isOutdated(ID, 4)).toBe(false);
    });
  });
});
