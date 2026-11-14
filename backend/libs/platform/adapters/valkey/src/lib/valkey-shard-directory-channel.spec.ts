import { EventEmitter } from 'node:events';
import {
  ShardDirectoryChangeKind,
  ShardingEvent,
  type ShardDirectoryChanged,
} from '@platform/sharding';
import type { ValkeyCommandRunner } from './valkey-client.js';
import {
  SHARD_DIRECTORY_CHANNEL,
  ValkeyShardDirectoryChannel,
  type ValkeySubscriberConnection,
} from './valkey-shard-directory-channel.js';

const change: ShardDirectoryChanged = {
  type: ShardingEvent.ShardDirectoryChanged,
  kind: ShardDirectoryChangeKind.TenantPlacement,
  tenantId: '01941f29-7c00-7000-8000-000000000001',
  version: 2,
};

/** A fake broker: PUBLISH on the publisher emits `message` on the subscriber. */
function broker() {
  const emitter = new EventEmitter();
  const subscribed = new Set<string>();
  const subscriber: ValkeySubscriberConnection & {
    subscribed: Set<string>;
  } = {
    subscribed,
    subscribe: async (...channels) =>
      channels.forEach((c) => subscribed.add(c)),
    unsubscribe: async (...channels) =>
      channels.forEach((c) => subscribed.delete(c)),
    on: (event, listener) => emitter.on(event, listener),
    off: (event, listener) => emitter.off(event, listener),
  };
  const publisher: ValkeyCommandRunner = {
    call: async (_command, [channel, message]) => {
      if (subscribed.has(String(channel))) {
        emitter.emit('message', String(channel), String(message));
      }
      return 1;
    },
  };
  return { emitter, subscriber, publisher };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('ValkeyShardDirectoryChannel', () => {
  it('delivers published changes to every handler and unsubscribes with the last one', async () => {
    const { subscriber, publisher } = broker();
    const channel = new ValkeyShardDirectoryChannel({ publisher, subscriber });
    const first = jest.fn();
    const second = jest.fn();
    const stopFirst = await channel.subscribe(first);
    const stopSecond = await channel.subscribe(second);
    expect(subscriber.subscribed).toEqual(new Set([SHARD_DIRECTORY_CHANNEL]));

    await channel.publish(change);
    await flush();
    expect(first).toHaveBeenCalledWith(change);
    expect(second).toHaveBeenCalledWith(change);

    await stopFirst();
    expect(subscriber.subscribed.size).toBe(1);
    await stopSecond();
    expect(subscriber.subscribed.size).toBe(0);
  });

  it('reports malformed messages and failing handlers without stopping', async () => {
    const { emitter, subscriber, publisher } = broker();
    const onError = jest.fn();
    const channel = new ValkeyShardDirectoryChannel({
      publisher,
      subscriber,
      onError,
    });
    const handler = jest.fn(() => {
      throw new Error('handler failed');
    });
    await channel.subscribe(handler);

    emitter.emit('message', SHARD_DIRECTORY_CHANNEL, '{bad');
    emitter.emit('message', 'other-channel', '{bad');
    await channel.publish(change);
    await flush();

    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'PLATFORM.VALKEY.UNEXPECTED_REPLY' }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
