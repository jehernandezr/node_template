import { TenantId, SystemClock } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { Deadline, DeadlineExceededError } from '@platform/primitives';
import { ShardingErrorCode } from '../errors/sharding-error-code.enum.js';
import { WrongRegionError } from '../errors/wrong-region.error.js';
import { InProcessDirectoryChannel } from '../in-process-directory-channel.js';
import { ShardDirectoryChangeKind } from '../model/shard-directory-change-kind.enum.js';
import { ShardAccess } from '../model/shard-access.enum.js';
import { ShardKey } from '../model/shard-key.enum.js';
import { ShardingEvent } from '../model/sharding-event.enum.js';
import { TenantStatus } from '../model/tenant-status.enum.js';
import { AsyncCall } from '../router/__tests__/utils/async-call.js';
import type { ResolveRequest } from '../router/resolve-request.js';
import type { ShardRouterOptions } from '../router/shard-router-options.js';
import { ShardRouter } from '../shard-router.js';
import { ConsistentHashStrategy } from '../sharding-strategy.js';
import {
  CountingDirectoryStore,
  FailingRoutingCache,
  InMemoryRoutingCache,
  PlacementBuilder,
  TestTenants,
} from './utils/index.js';

const LOCAL_TTL_MS = 60_000;

const READ: ResolveRequest = {
  tenantId: TestTenants.One,
  keyKind: ShardKey.Tenant,
  access: ShardAccess.Read,
};
const WRITE: ResolveRequest = { ...READ, access: ShardAccess.Write };

describe('ShardRouter', () => {
  let clock: FixedClock;
  let directory: CountingDirectoryStore;
  let errors: unknown[];

  beforeEach(() => {
    clock = new FixedClock();
    errors = [];
    directory = new CountingDirectoryStore();
    directory.setPlacement(PlacementBuilder.aPlacement().build());
    directory.setInstance('shard-1', 'node-a');
  });

  function routerWith(
    overrides: Partial<ShardRouterOptions> = {},
  ): ShardRouter {
    return new ShardRouter({
      strategy: new ConsistentHashStrategy(),
      directory,
      clock,
      onCacheError: (error) => errors.push(error),
      ...overrides,
    });
  }

  describe('resolve', () => {
    it('resolves the tenant, region, logical shard and instance', async () => {
      await expect(routerWith().resolve(READ)).resolves.toEqual({
        tenantId: TestTenants.One,
        region: 'eu',
        logicalShard: 'shard-1',
        instance: 'node-a',
        status: TenantStatus.Active,
      });
    });

    it('rejects a tenant placed in another region with WrongRegionError', async () => {
      await expect(
        routerWith({ currentRegion: 'us' }).resolve(READ),
      ).rejects.toBeInstanceOf(WrongRegionError);
    });

    it('tells a tenant of another region where its API lives', async () => {
      const router = routerWith({
        currentRegion: 'us',
        regions: [
          { code: 'us', apiBaseUrl: 'https://us.api', issuer: 'https://us.id' },
          { code: 'eu', apiBaseUrl: 'https://eu.api', issuer: 'https://eu.id' },
        ],
      });

      await expect(router.resolve(READ)).rejects.toMatchObject({
        code: ShardingErrorCode.WrongRegion,
        details: { region: 'eu', apiBaseUrl: 'https://eu.api' },
      });
    });

    it('reads the placement of a tenant without checking its region', async () => {
      const router = routerWith({ currentRegion: 'us' });

      await expect(router.placement(TestTenants.One)).resolves.toMatchObject({
        region: 'eu',
        shardGroup: ['shard-1'],
      });
    });

    it('picks the shard of a multi-shard group with the consistent hash strategy', async () => {
      directory.setInstance('shard-2', 'node-b');
      directory.setPlacement(
        PlacementBuilder.aPlacement()
          .withShardGroup('shard-1', 'shard-2')
          .build(),
      );
      const expected = new ConsistentHashStrategy().locate('user-42', [
        'shard-1',
        'shard-2',
      ]);

      const resolved = await routerWith().resolve({
        ...READ,
        keyKind: ShardKey.User,
        keyValue: 'User-42',
      });

      expect(resolved.logicalShard).toBe(expected);
    });

    it('resolves a custom key with its keyValue', async () => {
      const resolved = await routerWith().resolve({
        ...READ,
        keyKind: ShardKey.Custom,
        keyValue: 'Region-EU',
      });

      expect(resolved.logicalShard).toBe('shard-1');
    });
  });

  describe('access and status', () => {
    it('rejects a write to a migrating tenant with TenantMigrating', async () => {
      directory.setPlacement(
        PlacementBuilder.aPlacement()
          .withStatus(TenantStatus.Migrating)
          .build(),
      );

      await expect(routerWith().resolve(WRITE)).rejects.toMatchObject({
        code: ShardingErrorCode.TenantMigrating,
      });
    });

    it('rejects a write to a tenant that is not active with TenantNotWritable', async () => {
      directory.setPlacement(
        PlacementBuilder.aPlacement()
          .withStatus('frozen' as TenantStatus)
          .build(),
      );

      await expect(routerWith().resolve(WRITE)).rejects.toMatchObject({
        code: ShardingErrorCode.TenantNotWritable,
      });
    });

    it('lets a read through for a migrating tenant', async () => {
      directory.setPlacement(
        PlacementBuilder.aPlacement()
          .withStatus(TenantStatus.Migrating)
          .build(),
      );

      await expect(routerWith().resolve(READ)).resolves.toMatchObject({
        status: TenantStatus.Migrating,
      });
    });

    it('assertWritable throws for an already resolved migrating tenant', async () => {
      directory.setPlacement(
        PlacementBuilder.aPlacement()
          .withStatus(TenantStatus.Migrating)
          .build(),
      );
      const router = routerWith();
      const resolved = await router.resolve(READ);

      await expect(
        AsyncCall.run(() => router.assertWritable(resolved)),
      ).rejects.toMatchObject({ code: ShardingErrorCode.TenantMigrating });
    });
  });

  describe('caching', () => {
    it('serves a repeated lookup from memory until localTtlMs passes', async () => {
      const router = routerWith();
      await router.resolve(READ);
      await router.resolve(READ);
      expect(directory.placementReads).toBe(1);

      clock.advance(LOCAL_TTL_MS - 1);
      await router.resolve(READ);
      expect(directory.placementReads).toBe(1);

      clock.advance(1);
      await router.resolve(READ);
      expect(directory.placementReads).toBe(2);
    });

    it('a second router reads the placement from the shared cache without the directory', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      await routerWith({ sharedCache }).resolve(READ);

      await routerWith({ sharedCache }).resolve(READ);

      expect(directory.placementReads).toBe(1);
    });
  });

  describe('cache outage', () => {
    it('resolves from the directory when the shared cache fails to read', async () => {
      const failing = new FailingRoutingCache();
      failing.failReads = true;

      await expect(
        routerWith({ sharedCache: failing }).resolve(READ),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
      expect(errors).toEqual([new Error('shared cache is down')]);
    });

    it('resolves when the shared cache fails to write', async () => {
      const failing = new FailingRoutingCache();
      failing.failWrites = true;

      await expect(
        routerWith({ sharedCache: failing }).resolve(READ),
      ).resolves.toMatchObject({ logicalShard: 'shard-1' });
      expect(errors).toEqual([new Error('shared cache is down')]);
    });

    it('invalidate does not fail when the shared cache fails to write', async () => {
      const failing = new FailingRoutingCache();
      failing.failWrites = true;

      await expect(
        routerWith({ sharedCache: failing }).invalidate(TestTenants.One),
      ).resolves.toBeUndefined();
      expect(errors).toEqual([new Error('shared cache is down')]);
    });
  });

  describe('invalidation', () => {
    it('invalidate makes the next resolve read the directory again', async () => {
      const router = routerWith();
      await router.resolve(READ);

      await router.invalidate(TestTenants.One);
      await router.resolve(READ);

      expect(directory.placementReads).toBe(2);
    });

    it('invalidateShard makes the next resolve read the instance again', async () => {
      const router = routerWith();
      await router.resolve(READ);

      router.invalidateShard('shard-1');
      await router.resolve(READ);

      expect(directory.instanceReads).toBe(2);
    });

    it('a change published by another process makes this router read the directory again', async () => {
      const channel = new InProcessDirectoryChannel();
      const writer = routerWith({ changes: channel });
      const reader = routerWith();
      await reader.listen(channel);
      await reader.resolve(READ);
      expect(directory.placementReads).toBe(1);

      await writer.invalidate(TestTenants.One);
      await reader.resolve(READ);

      expect(directory.placementReads).toBe(2);
    });

    it('applyDirectoryChange reports a malformed event and does not throw', () => {
      const router = routerWith();

      expect(() =>
        router.applyDirectoryChange({
          type: ShardingEvent.ShardDirectoryChanged,
          kind: ShardDirectoryChangeKind.ShardInstance,
          logicalShard: '',
        }),
      ).not.toThrow();
      expect(errors).toMatchObject([
        { code: ShardingErrorCode.InvalidConfiguration },
      ]);
    });
  });

  describe('input limits', () => {
    it.each<
      [string, Partial<ShardRouterOptions>, ResolveRequest, ShardingErrorCode]
    >([
      [
        'an empty tenant id',
        {},
        { ...READ, tenantId: '' },
        ShardingErrorCode.KeyMissing,
      ],
      [
        'a tenant id without the expected format',
        {},
        { ...READ, tenantId: 'tenant-1' },
        ShardingErrorCode.InvalidTenantId,
      ],
      [
        'a tenant id longer than TenantId.MAX_LENGTH',
        { tenantIdPattern: /^t+$/ },
        { ...READ, tenantId: 't'.repeat(TenantId.MAX_LENGTH + 1) },
        ShardingErrorCode.InvalidTenantId,
      ],
      [
        'a user key without keyValue',
        {},
        { ...READ, keyKind: ShardKey.User },
        ShardingErrorCode.KeyMissing,
      ],
      [
        'a keyValue longer than maxKeyLength',
        { maxKeyLength: 4 },
        { ...READ, keyKind: ShardKey.User, keyValue: 'abcde' },
        ShardingErrorCode.InvalidKey,
      ],
    ])('rejects %s', async (_name, overrides, request, code) => {
      await expect(
        routerWith(overrides).resolve(request),
      ).rejects.toMatchObject({
        code,
      });
    });
  });

  describe('deadline and cancellation', () => {
    it('rejects with DeadlineExceededError when the deadline has already passed', async () => {
      await expect(
        routerWith().resolve({ ...READ, deadline: Deadline.after(0, clock) }),
      ).rejects.toBeInstanceOf(DeadlineExceededError);
    });

    it('rejects with the signal reason when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort(new Error('cancelled'));

      await expect(
        routerWith().resolve({ ...READ, signal: controller.signal }),
      ).rejects.toThrow('cancelled');
    });

    it('a caller that aborts while the load is pending gets the reason, and another caller still resolves', async () => {
      const router = routerWith();
      const controller = new AbortController();
      const release = directory.hold();

      const waiting = router.resolve({ ...READ, signal: controller.signal });
      const other = router.resolve(READ);
      controller.abort(new Error('cancelled'));
      await expect(waiting).rejects.toThrow('cancelled');

      release();
      await expect(other).resolves.toMatchObject({ logicalShard: 'shard-1' });
    });
  });

  describe('bounded memory', () => {
    it('with maxPlacements 1, an evicted tenant is read from the directory again', async () => {
      directory.setPlacement(
        PlacementBuilder.aPlacement().withTenantId(TestTenants.Two).build(),
      );
      const router = routerWith({ maxPlacements: 1 });

      await router.resolve(READ);
      await router.resolve({ ...READ, tenantId: TestTenants.Two });
      await router.resolve(READ);

      expect(directory.placementReads).toBe(3);
    });
  });

  describe('when several tenants share a shard', () => {
    const tenants = [TestTenants.One, TestTenants.Two, TestTenants.Three];
    const readOf = (tenantId: string): ResolveRequest => ({
      ...READ,
      tenantId,
    });
    const instancesOf = async (router: ShardRouter): Promise<string[]> =>
      (
        await Promise.all(
          tenants.map((tenantId) => router.resolve(readOf(tenantId))),
        )
      ).map((placement) => placement.instance);

    beforeEach(() => {
      for (const tenantId of tenants) {
        directory.setPlacement(
          PlacementBuilder.aPlacement().withTenantId(tenantId).build(),
        );
      }
    });

    it('routes every tenant of the shard to its instance, reading the instance once, and all of them to the new one once the shard moves', async () => {
      const router = routerWith();

      for (const tenantId of tenants) {
        await expect(router.resolve(readOf(tenantId))).resolves.toMatchObject({
          logicalShard: 'shard-1',
          instance: 'node-a',
        });
      }
      expect(directory.instanceReads).toBe(1);

      directory.setInstance('shard-1', 'node-b');
      router.invalidateShard('shard-1');

      await expect(instancesOf(router)).resolves.toEqual([
        'node-b',
        'node-b',
        'node-b',
      ]);
    });

    it('moves one tenant to another shard and leaves the others where they were', async () => {
      const router = routerWith();
      await instancesOf(router);
      directory.setPlacement(
        PlacementBuilder.aPlacement()
          .withTenantId(TestTenants.Two)
          .withShardGroup('shard-2')
          .withVersion(2)
          .build(),
      );
      directory.setInstance('shard-2', 'node-c');

      await router.invalidate(TestTenants.Two);

      await expect(instancesOf(router)).resolves.toEqual([
        'node-a',
        'node-c',
        'node-a',
      ]);
      expect(directory.placementReads).toBe(tenants.length + 1);
    });

    it('never keeps the old instance cached when the shard moves while reads of its tenants are in flight', async () => {
      const router = routerWith();
      const release = directory.hold();
      const inFlight = instancesOf(router);

      directory.setInstance('shard-1', 'node-b');
      router.invalidateShard('shard-1');
      release();
      await inFlight;

      await expect(instancesOf(router)).resolves.toEqual([
        'node-b',
        'node-b',
        'node-b',
      ]);
    });
  });

  describe('single flight', () => {
    it('one hundred concurrent resolves of one tenant read the directory once', async () => {
      const router = routerWith();
      const release = directory.hold();

      const all = Promise.all(
        Array.from({ length: 100 }, () => router.resolve(READ)),
      );
      release();
      const results = await all;

      expect(directory.placementReads).toBe(1);
      expect(
        new Set(results.map((result) => JSON.stringify(result))).size,
      ).toBe(1);
    });
  });

  describe('options', () => {
    it.each<[string, Partial<ShardRouterOptions>]>([
      ['localTtlMs', { localTtlMs: -1 }],
      ['sharedTtlMs', { sharedTtlMs: Number.NaN }],
      ['tombstoneTtlMs', { tombstoneTtlMs: 0 }],
      ['maxPlacements', { maxPlacements: 0 }],
      ['maxInstances', { maxInstances: 0 }],
      ['maxKeyLength', { maxKeyLength: 0 }],
      ['tenantIdPattern', { tenantIdPattern: /x/g }],
      ['tenantIdPattern', { tenantIdPattern: /x/y }],
    ])(
      'rejects an invalid %s with InvalidConfiguration',
      async (option, overrides) => {
        await expect(
          AsyncCall.run(
            () =>
              new ShardRouter({
                strategy: new ConsistentHashStrategy(),
                clock: new SystemClock(),
                directory,
                ...overrides,
              }),
          ),
        ).rejects.toMatchObject({
          code: ShardingErrorCode.InvalidConfiguration,
          details: { option },
        });
      },
    );
  });
});
