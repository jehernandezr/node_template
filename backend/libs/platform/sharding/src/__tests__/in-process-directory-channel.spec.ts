import type { ShardDirectoryChanged } from '../model/shard-directory-changed.js';
import { ShardDirectoryChangeKind } from '../model/shard-directory-change-kind.enum.js';
import { ShardingEvent } from '../model/sharding-event.enum.js';
import { InProcessDirectoryChannel } from '../in-process-directory-channel.js';
import { TestTenants } from './utils/index.js';

const placementChange: ShardDirectoryChanged = {
  type: ShardingEvent.ShardDirectoryChanged,
  kind: ShardDirectoryChangeKind.TenantPlacement,
  tenantId: TestTenants.One,
  version: 2,
};

const instanceChange: ShardDirectoryChanged = {
  type: ShardingEvent.ShardDirectoryChanged,
  kind: ShardDirectoryChangeKind.ShardInstance,
  logicalShard: 'shard-1',
};

describe('InProcessDirectoryChannel', () => {
  let channel: InProcessDirectoryChannel;

  beforeEach(() => {
    channel = new InProcessDirectoryChannel();
  });

  describe('when a change is published', () => {
    it('reaches every subscriber', async () => {
      const first: ShardDirectoryChanged[] = [];
      const second: ShardDirectoryChanged[] = [];
      await channel.subscribe((event) => {
        first.push(event);
      });
      await channel.subscribe((event) => {
        second.push(event);
      });

      await channel.publish(placementChange);
      await channel.publish(instanceChange);

      expect(first).toEqual([placementChange, instanceChange]);
      expect(second).toEqual([placementChange, instanceChange]);
    });

    it('reaches the same handler once per subscription', async () => {
      const received: ShardDirectoryChanged[] = [];
      const handler = (event: ShardDirectoryChanged): void => {
        received.push(event);
      };
      await channel.subscribe(handler);
      await channel.subscribe(handler);

      await channel.publish(placementChange);

      expect(received).toEqual([placementChange, placementChange]);
    });
  });

  describe('when a subscription is cancelled', () => {
    it('keeps delivering through the other subscription of the same handler', async () => {
      const received: ShardDirectoryChanged[] = [];
      const handler = (event: ShardDirectoryChanged): void => {
        received.push(event);
      };
      const stopFirst = await channel.subscribe(handler);
      await channel.subscribe(handler);

      await stopFirst();
      await channel.publish(placementChange);

      expect(received).toEqual([placementChange]);
    });

    it('stops delivering to a cancelled subscriber', async () => {
      const received: ShardDirectoryChanged[] = [];
      const stop = await channel.subscribe((event) => {
        received.push(event);
      });

      await channel.publish(placementChange);
      await stop();
      await channel.publish(instanceChange);

      expect(received).toEqual([placementChange]);
    });
  });

  describe('when counting subscribers', () => {
    it('reflects subscriptions and cancellations', async () => {
      const stop = await channel.subscribe(() => undefined);
      await channel.subscribe(() => undefined);
      expect(channel.subscriberCount).toBe(2);
      await stop();
      expect(channel.subscriberCount).toBe(1);
    });
  });
});
