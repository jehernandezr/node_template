import { FixedClock } from '@platform/kernel/test-utils';
import { TenantId } from '@platform/kernel';
import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import { ShardDirectoryChangeKind } from '../../model/shard-directory-change-kind.enum.js';
import type { ShardDirectoryChanged } from '../../model/shard-directory-changed.js';
import { ShardingEvent } from '../../model/sharding-event.enum.js';
import {
  InMemoryDirectoryStore,
  InMemoryRoutingCache,
  PlacementBuilder,
  TestTenants,
} from '../../__tests__/utils/index.js';
import { InProcessDirectoryChannel } from '../../in-process-directory-channel.js';
import { ShardDirectoryChangePublisher } from '../../ports/shard-directory-change-publisher.js';
import type { RoutingCache } from '../../ports/routing-cache.js';
import { InstanceResolver } from '../instance-resolver.js';
import type { InvalidateOptions } from '../invalidate-options.js';
import { InvalidationLog } from '../invalidation-log.js';
import { PlacementCache } from '../placement-cache.js';
import { PlacementCodec } from '../placement-codec.js';
import { PlacementInvalidator } from '../placement-invalidator.js';
import { RoutingKeyNormalizer } from '../routing-key-normalizer.js';
import { SharedRecordKind } from '../shared-record-kind.enum.js';
import { AsyncCall } from './utils/async-call.js';

const LOCAL_TTL_MS = 60_000;
const SHARED_TTL_MS = 300_000;
const TOMBSTONE_TTL_MS = 30_000;
const ID = TestTenants.One;
const KEY = PlacementCache.KEY_PREFIX + ID;

class FailingPublisher extends ShardDirectoryChangePublisher {
  async publish(): Promise<void> {
    throw new Error('channel is down');
  }
}

describe('PlacementInvalidator', () => {
  let clock: FixedClock;
  let directory: InMemoryDirectoryStore;
  let errors: unknown[];

  beforeEach(() => {
    clock = new FixedClock();
    errors = [];
    directory = new InMemoryDirectoryStore();
    directory.setInstance('shard-1', 'node-a');
    directory.setInstance('shard-2', 'node-b');
  });

  function build(
    sharedCache: RoutingCache | undefined,
    publisher?: ShardDirectoryChangePublisher,
  ) {
    const onError = (error: unknown) => errors.push(error);
    const cache = new PlacementCache(
      {
        localTtlMs: LOCAL_TTL_MS,
        sharedTtlMs: SHARED_TTL_MS,
        tombstoneTtlMs: TOMBSTONE_TTL_MS,
        maxPlacements: 100,
      },
      clock,
      sharedCache,
      onError,
    );
    const instances = new InstanceResolver(directory, clock, LOCAL_TTL_MS, 100);
    const invalidator = new PlacementInvalidator(
      cache,
      instances,
      new InvalidationLog(100),
      new RoutingKeyNormalizer(TenantId.DEFAULT_PATTERN, 256),
      publisher,
      onError,
    );
    return { cache, instances, invalidator };
  }

  describe('local state', () => {
    it('drops the placement cached in this process', async () => {
      const { cache, invalidator } = build(undefined);
      cache.remember(
        ID,
        PlacementBuilder.aPlacement().build(),
        Number.POSITIVE_INFINITY,
      );

      await invalidator.invalidate(ID, {});

      expect(cache.local(ID)).toBeUndefined();
    });

    it('leaves a tombstone in the shared cache', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      const { cache, invalidator } = build(sharedCache);

      await invalidator.invalidate(ID, {});

      expect((await cache.readShared(ID))?.kind).toBe(
        SharedRecordKind.Tombstone,
      );
    });
  });

  describe('versions', () => {
    it('with a version, the tombstone refuses older versions and accepts that one', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      const { invalidator } = build(sharedCache);

      await invalidator.invalidate(ID, { version: 5 });

      await expect(
        sharedCache.setIfNewer(
          KEY,
          'stale',
          PlacementCodec.cacheVersion(4),
          SHARED_TTL_MS,
        ),
      ).resolves.toBe(false);
      await expect(
        sharedCache.setIfNewer(
          KEY,
          'fresh',
          PlacementCodec.cacheVersion(5),
          SHARED_TTL_MS,
        ),
      ).resolves.toBe(true);
    });

    it('without a known version, the tombstone refuses every version until it expires', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      const { invalidator } = build(sharedCache);

      await invalidator.invalidate(ID, {});
      await expect(
        sharedCache.setIfNewer(
          KEY,
          'any',
          PlacementCodec.cacheVersion(1),
          SHARED_TTL_MS,
        ),
      ).resolves.toBe(false);

      clock.advance(TOMBSTONE_TTL_MS);

      await expect(
        sharedCache.setIfNewer(
          KEY,
          'any',
          PlacementCodec.cacheVersion(1),
          SHARED_TTL_MS,
        ),
      ).resolves.toBe(true);
    });
  });

  describe('instances', () => {
    it('invalidates the instances of the shard group read from the shared cache after the local placement expired', async () => {
      const sharedCache = new InMemoryRoutingCache(clock);
      const { cache, instances, invalidator } = build(sharedCache);
      const placement = PlacementBuilder.aPlacement()
        .withShardGroup('shard-1', 'shard-2')
        .build();
      await sharedCache.setIfNewer(
        KEY,
        PlacementCodec.encodeEntry({
          placement,
          expiresAt: clock.now().getTime() + SHARED_TTL_MS,
        }),
        PlacementCodec.cacheVersion(placement.version),
        SHARED_TTL_MS,
      );
      cache.remember(ID, placement, Number.POSITIVE_INFINITY);
      clock.advance(LOCAL_TTL_MS);
      await instances.load('shard-1');
      await instances.load('shard-2');

      await invalidator.invalidate(ID, {});

      expect(instances.cached('shard-1')).toBeUndefined();
      expect(instances.cached('shard-2')).toBeUndefined();
    });
  });

  describe('publishing', () => {
    it.each<[string, InvalidateOptions, ShardDirectoryChanged]>([
      [
        'with a version',
        { version: 3 },
        {
          type: ShardingEvent.ShardDirectoryChanged,
          kind: ShardDirectoryChangeKind.TenantPlacement,
          tenantId: ID,
          version: 3,
        },
      ],
      [
        'without a version',
        {},
        {
          type: ShardingEvent.ShardDirectoryChanged,
          kind: ShardDirectoryChangeKind.TenantPlacement,
          tenantId: ID,
        },
      ],
    ])(
      'publishes the change %s to subscribers',
      async (_name, options, expected) => {
        const channel = new InProcessDirectoryChannel();
        const events: ShardDirectoryChanged[] = [];
        await channel.subscribe((event) => {
          events.push(event);
        });
        const { invalidator } = build(undefined, channel);

        await invalidator.invalidate(ID, options);

        expect(events).toEqual([expected]);
      },
    );

    it('a failing publisher does not fail invalidate and reports the error', async () => {
      const { invalidator } = build(undefined, new FailingPublisher());

      await expect(invalidator.invalidate(ID, {})).resolves.toBeUndefined();
      expect(errors).toEqual([new Error('channel is down')]);
    });
  });

  describe('input', () => {
    it.each([[-1], [1.5]])(
      'rejects version %p with InvalidConfiguration',
      async (version) => {
        const { invalidator } = build(undefined);

        await expect(
          invalidator.invalidate(ID, { version }),
        ).rejects.toMatchObject({
          code: ShardingErrorCode.InvalidConfiguration,
          details: { option: 'version' },
        });
      },
    );

    it.each<[string, string, ShardingErrorCode]>([
      ['an empty id', '', ShardingErrorCode.KeyMissing],
      ['a malformed id', 'not-a-uuid', ShardingErrorCode.InvalidTenantId],
    ])('rejects %s with its error code', async (_name, id, code) => {
      const { invalidator } = build(undefined);

      await expect(
        AsyncCall.run(() => invalidator.invalidate(id, {})),
      ).rejects.toMatchObject({
        code,
      });
    });
  });
});
