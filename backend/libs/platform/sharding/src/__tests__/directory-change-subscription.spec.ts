import { ConsistentHashStrategy } from '../sharding-strategy.js';
import { FixedClock } from '@platform/kernel/test-utils';
import { DirectoryChangeSubscription } from '../directory-change-subscription.js';
import { InProcessDirectoryChannel } from '../in-process-directory-channel.js';
import { ShardAccess } from '../model/shard-access.enum.js';
import { ShardDirectoryChangeKind } from '../model/shard-directory-change-kind.enum.js';
import { ShardKey } from '../model/shard-key.enum.js';
import { ShardingEvent } from '../model/sharding-event.enum.js';
import { ShardRouter } from '../shard-router.js';
import {
  CountingDirectoryStore,
  PlacementBuilder,
  TestTenants,
} from './utils/index.js';

const REQUEST = {
  tenantId: TestTenants.One,
  keyKind: ShardKey.Tenant,
  access: ShardAccess.Read,
};

describe('DirectoryChangeSubscription', () => {
  let directory: CountingDirectoryStore;
  let channel: InProcessDirectoryChannel;
  let router: ShardRouter;
  let subscription: DirectoryChangeSubscription;

  beforeEach(() => {
    directory = new CountingDirectoryStore();
    directory.setPlacement(PlacementBuilder.aPlacement().build());
    directory.setInstance('shard-1', 'db-1');
    channel = new InProcessDirectoryChannel();
    router = new ShardRouter({
      strategy: new ConsistentHashStrategy(),
      directory,
      clock: new FixedClock(),
    });
    subscription = new DirectoryChangeSubscription(router, channel);
  });

  afterEach(async () => {
    await subscription.stop();
  });

  describe('when started', () => {
    it('subscribes to the channel', async () => {
      await subscription.start();
      expect(channel.subscriberCount).toBe(1);
    });

    it('subscribes only once when started twice', async () => {
      await subscription.start();
      await subscription.start();
      expect(channel.subscriberCount).toBe(1);
    });
  });

  describe('when a placement change is published', () => {
    it('invalidates the cached placement', async () => {
      await subscription.start();
      await router.resolve(REQUEST);
      expect(directory.placementReads).toBe(1);
      await channel.publish({
        type: ShardingEvent.ShardDirectoryChanged,
        kind: ShardDirectoryChangeKind.TenantPlacement,
        tenantId: TestTenants.One,
      });
      await router.resolve(REQUEST);
      expect(directory.placementReads).toBe(2);
    });
  });

  describe('when stopped', () => {
    it('closes the channel subscription', async () => {
      await subscription.start();
      await subscription.stop();
      expect(channel.subscriberCount).toBe(0);
    });

    it('resolves a second stop without error', async () => {
      await subscription.start();
      await subscription.stop();
      await expect(subscription.stop()).resolves.toBeUndefined();
    });
  });
});
