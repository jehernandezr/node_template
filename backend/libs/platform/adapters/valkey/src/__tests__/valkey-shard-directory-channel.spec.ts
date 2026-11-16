import {
  ShardDirectoryChangeKind,
  ShardingEvent,
  type ShardDirectoryChanged,
} from '@platform/sharding';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyErrorTranslator } from '../valkey-error-translator.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeyShardDirectoryChannel } from '../valkey-shard-directory-channel.js';
import { ValkeySubscriberSource } from '../valkey-subscriber-source.js';
import {
  FakePubSubBroker,
  RecordingChangeHandler,
  RecordingErrorListener,
} from './utils/index.js';

const CHANNEL = 'orders:sharding:directory-changed';

const change: ShardDirectoryChanged = {
  type: ShardingEvent.ShardDirectoryChanged,
  kind: ShardDirectoryChangeKind.TenantPlacement,
  tenantId: '01941f29-7c00-7000-8000-000000000001',
  version: 2,
};

const flush = (): Promise<void> =>
  new Promise<void>((resolve) => setImmediate(resolve));

function channelOver(
  broker: FakePubSubBroker,
  onError?: (error: unknown) => void,
): ValkeyShardDirectoryChannel {
  return new ValkeyShardDirectoryChannel(
    new ValkeyCommandExecutor(broker.publisher, new ValkeyErrorTranslator()),
    new ValkeySubscriberSource(broker.opener),
    new ValkeyKeyspace('orders'),
    onError,
  );
}

describe('ValkeyShardDirectoryChannel', () => {
  it('delivers published changes to every handler and unsubscribes with the last one', async () => {
    const broker = new FakePubSubBroker();
    const channel = channelOver(broker);
    const first = new RecordingChangeHandler();
    const second = new RecordingChangeHandler();
    const stopFirst = await channel.subscribe(first.handle);
    const stopSecond = await channel.subscribe(second.handle);
    expect(broker.subscribed).toEqual(new Set([CHANNEL]));

    await channel.publish(change);
    await flush();
    expect(first.received).toEqual([change]);
    expect(second.received).toEqual([change]);

    await stopFirst();
    expect(broker.subscribed.size).toBe(1);
    await stopSecond();
    expect(broker.subscribed.size).toBe(0);
  });

  it('opens one subscriber connection however many handlers subscribe', async () => {
    const broker = new FakePubSubBroker();
    const channel = channelOver(broker);
    const stopFirst = await channel.subscribe(
      new RecordingChangeHandler().handle,
    );
    await stopFirst();
    await channel.subscribe(new RecordingChangeHandler().handle);
    expect(broker.opened).toBe(1);
  });

  it('removes a handler subscribed twice only once per stop', async () => {
    const broker = new FakePubSubBroker();
    const channel = channelOver(broker);
    const handler = new RecordingChangeHandler();
    const stopA = await channel.subscribe(handler.handle);
    const stopB = await channel.subscribe(handler.handle);
    await stopA();
    await stopA();
    await channel.publish(change);
    await flush();
    expect(handler.received).toHaveLength(1);
    await stopB();
    expect(broker.subscribed.size).toBe(0);
  });

  it('reports malformed messages and failing handlers without stopping', async () => {
    const broker = new FakePubSubBroker();
    const errors = new RecordingErrorListener();
    const channel = channelOver(broker, errors.report);
    const handler = new RecordingChangeHandler(new Error('handler failed'));
    await channel.subscribe(handler.handle);

    broker.emit(CHANNEL, '{bad');
    broker.emit('other-channel', '{bad');
    await channel.publish(change);
    await flush();

    expect(errors.errors).toHaveLength(2);
    expect(errors.errors[0]).toMatchObject({
      code: 'PLATFORM.VALKEY.UNEXPECTED_REPLY',
    });
    expect(errors.errors[1]).toEqual(new Error('handler failed'));
    expect(handler.received).toEqual([change]);
  });

  it('ignores errors when nobody listens for them', async () => {
    const broker = new FakePubSubBroker();
    const channel = channelOver(broker);
    await channel.subscribe(new RecordingChangeHandler().handle);
    broker.emit(CHANNEL, '{bad');
    await flush();
  });

  it('forgets the handler and stops listening when the subscription fails', async () => {
    const broker = new FakePubSubBroker();
    broker.subscribeFailure = new Error('NOPERM');
    const channel = channelOver(broker);
    await expect(
      channel.subscribe(new RecordingChangeHandler().handle),
    ).rejects.toThrow('NOPERM');

    const handler = new RecordingChangeHandler();
    await channel.subscribe(handler.handle);
    await channel.publish(change);
    await flush();
    expect(handler.received).toHaveLength(1);
  });
});
