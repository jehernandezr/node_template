import { FixedClock } from '@platform/kernel/test-utils';
import { TenantId } from '@platform/kernel';
import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import { ShardDirectoryChangeKind } from '../../model/shard-directory-change-kind.enum.js';
import type { ShardDirectoryChanged } from '../../model/shard-directory-changed.js';
import { ShardingEvent } from '../../model/sharding-event.enum.js';
import {
  InMemoryDirectoryStore,
  PlacementBuilder,
  TestTenants,
} from '../../__tests__/utils/index.js';
import { DirectoryChangeApplier } from '../directory-change-applier.js';
import { InstanceResolver } from '../instance-resolver.js';
import { InvalidationLog } from '../invalidation-log.js';
import { PlacementCache } from '../placement-cache.js';
import { RoutingKeyNormalizer } from '../routing-key-normalizer.js';

const LOCAL_TTL_MS = 60_000;
const ID = TestTenants.One;

describe('DirectoryChangeApplier', () => {
  let clock: FixedClock;
  let directory: InMemoryDirectoryStore;
  let errors: unknown[];
  let cache: PlacementCache;
  let instances: InstanceResolver;
  let applier: DirectoryChangeApplier;

  beforeEach(() => {
    clock = new FixedClock();
    errors = [];
    directory = new InMemoryDirectoryStore();
    directory.setInstance('shard-1', 'node-a');
    directory.setInstance('shard-2', 'node-b');
    cache = new PlacementCache(
      {
        localTtlMs: LOCAL_TTL_MS,
        sharedTtlMs: 300_000,
        tombstoneTtlMs: 30_000,
        maxPlacements: 100,
      },
      clock,
      undefined,
      (error) => errors.push(error),
    );
    instances = new InstanceResolver(directory, clock, LOCAL_TTL_MS, 100);
    applier = new DirectoryChangeApplier(
      cache,
      instances,
      new InvalidationLog(100),
      new RoutingKeyNormalizer(TenantId.DEFAULT_PATTERN, 256),
      (error) => errors.push(error),
    );
  });

  describe('placement changes', () => {
    it('a newer version discards the cached placement and marks older ones outdated', () => {
      cache.remember(
        ID,
        PlacementBuilder.aPlacement().withVersion(3).build(),
        Number.POSITIVE_INFINITY,
      );

      applier.apply({
        type: ShardingEvent.ShardDirectoryChanged,
        kind: ShardDirectoryChangeKind.TenantPlacement,
        tenantId: ID,
        version: 5,
      });

      expect(cache.local(ID)).toBeUndefined();
      expect(cache.isOutdated(ID, 3)).toBe(true);
    });

    it.each([[3], [2]])(
      'an event at version %i keeps the cached placement at version 3',
      (version) => {
        cache.remember(
          ID,
          PlacementBuilder.aPlacement().withVersion(3).build(),
          Number.POSITIVE_INFINITY,
        );

        applier.apply({
          type: ShardingEvent.ShardDirectoryChanged,
          kind: ShardDirectoryChangeKind.TenantPlacement,
          tenantId: ID,
          version,
        });

        expect(cache.local(ID)).toBeDefined();
      },
    );

    it('a change without a version discards the cached placement', () => {
      cache.remember(
        ID,
        PlacementBuilder.aPlacement().withVersion(3).build(),
        Number.POSITIVE_INFINITY,
      );

      applier.apply({
        type: ShardingEvent.ShardDirectoryChanged,
        kind: ShardDirectoryChangeKind.TenantPlacement,
        tenantId: ID,
      });

      expect(cache.local(ID)).toBeUndefined();
    });
  });

  describe('instance changes', () => {
    it('drops only the changed instance', async () => {
      await instances.load('shard-1');
      await instances.load('shard-2');

      applier.apply({
        type: ShardingEvent.ShardDirectoryChanged,
        kind: ShardDirectoryChangeKind.ShardInstance,
        logicalShard: 'shard-1',
      });

      expect(instances.cached('shard-1')).toBeUndefined();
      expect(instances.cached('shard-2')).toBe('node-b');
    });
  });

  describe('malformed events', () => {
    it.each<[string, ShardDirectoryChanged, ShardingErrorCode]>([
      [
        'an empty logical shard',
        {
          type: ShardingEvent.ShardDirectoryChanged,
          kind: ShardDirectoryChangeKind.ShardInstance,
          logicalShard: '',
        },
        ShardingErrorCode.InvalidConfiguration,
      ],
      [
        'a negative version',
        {
          type: ShardingEvent.ShardDirectoryChanged,
          kind: ShardDirectoryChangeKind.TenantPlacement,
          tenantId: ID,
          version: -1,
        },
        ShardingErrorCode.InvalidConfiguration,
      ],
      [
        'an invalid tenant id',
        {
          type: ShardingEvent.ShardDirectoryChanged,
          kind: ShardDirectoryChangeKind.TenantPlacement,
          tenantId: 'not-a-uuid',
        },
        ShardingErrorCode.InvalidTenantId,
      ],
    ])('reports %s to onError without throwing', (_name, event, code) => {
      expect(() => applier.apply(event)).not.toThrow();
      expect(errors).toMatchObject([{ code }]);
    });
  });
});
