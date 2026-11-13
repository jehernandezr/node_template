import {
  decodeShardDirectoryChanged,
  encodeShardDirectoryChanged,
  type ShardDirectoryChangeHandler,
  type ShardDirectoryChangePublisher,
  type ShardDirectoryChangeSubscriber,
  type ShardDirectoryChanged,
} from '@platform/sharding';
import {
  runCommand,
  ValkeyCommand,
  type ValkeyCommandRunner,
} from './valkey-client.js';
import { ValkeyUnexpectedReplyError } from './valkey-error.js';

/** Default pub/sub channel of directory changes. */
export const SHARD_DIRECTORY_CHANNEL = 'platform:sharding:directory-changed';

/** Listener of a subscriber connection: channel and message. */
export type ValkeyMessageListener = (channel: string, message: string) => void;

/**
 * The part of a dedicated subscriber connection the channel uses. An iovalkey client in subscriber mode
 * (`client.duplicate()`) satisfies it.
 */
export interface ValkeySubscriberConnection {
  subscribe(...channels: string[]): Promise<unknown>;
  unsubscribe(...channels: string[]): Promise<unknown>;
  on(event: 'message', listener: ValkeyMessageListener): unknown;
  off(event: 'message', listener: ValkeyMessageListener): unknown;
}

/** Options of {@link ValkeyShardDirectoryChannel}. */
export interface ValkeyShardDirectoryChannelOptions {
  /** Connection that publishes (any regular client). */
  readonly publisher: ValkeyCommandRunner;
  /** Dedicated connection in subscriber mode. */
  readonly subscriber: ValkeySubscriberConnection;
  /** Default {@link SHARD_DIRECTORY_CHANNEL}. One channel per service keeps services apart. */
  readonly channel?: string;
  /** Receives malformed messages and handler failures. They never stop the channel. */
  readonly onError?: (error: unknown) => void;
}

/**
 * `ShardingEvent.ShardDirectoryChanged` over Valkey pub/sub. Delivery is at most once and only to processes
 * connected at the time, which is what a cache invalidation needs: a process that misses a message still
 * finds the tombstone in the shared cache and drops its copy after `localTtlMs`. The messaging bus can
 * implement the same ports when durable delivery is wanted.
 */
export class ValkeyShardDirectoryChannel
  implements ShardDirectoryChangePublisher, ShardDirectoryChangeSubscriber
{
  private readonly publisher: ValkeyCommandRunner;
  private readonly subscriber: ValkeySubscriberConnection;
  private readonly channel: string;
  private readonly onError: (error: unknown) => void;
  private readonly handlers = new Set<ShardDirectoryChangeHandler>();
  private readonly listener: ValkeyMessageListener;

  constructor(options: ValkeyShardDirectoryChannelOptions) {
    this.publisher = options.publisher;
    this.subscriber = options.subscriber;
    this.channel = options.channel ?? SHARD_DIRECTORY_CHANNEL;
    this.onError = options.onError ?? (() => undefined);
    this.listener = (channel, message) => this.deliver(channel, message);
  }

  async publish(event: ShardDirectoryChanged): Promise<void> {
    await runCommand(this.publisher, ValkeyCommand.Publish, [
      this.channel,
      encodeShardDirectoryChanged(event),
    ]);
  }

  async subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>> {
    // Wrap so the same handler can be subscribed twice and removed once.
    const entry: ShardDirectoryChangeHandler = (event) => handler(event);
    const first = this.handlers.size === 0;
    this.handlers.add(entry);
    if (first) {
      this.subscriber.on('message', this.listener);
      try {
        await this.subscriber.subscribe(this.channel);
      } catch (error) {
        this.handlers.delete(entry);
        this.subscriber.off('message', this.listener);
        throw error;
      }
    }
    return async () => {
      if (!this.handlers.delete(entry) || this.handlers.size > 0) {
        return;
      }
      this.subscriber.off('message', this.listener);
      await this.subscriber.unsubscribe(this.channel);
    };
  }

  private deliver(channel: string, message: string): void {
    if (channel !== this.channel) {
      return;
    }
    const event = decodeShardDirectoryChanged(message);
    if (event === undefined) {
      this.onError(
        new ValkeyUnexpectedReplyError(
          ValkeyCommand.Publish,
          'a ShardDirectoryChanged message',
        ),
      );
      return;
    }
    for (const handler of this.handlers) {
      Promise.resolve()
        .then(() => handler(event))
        .catch((error: unknown) => this.onError(error));
    }
  }
}
