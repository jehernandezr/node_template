import {
  ShardDirectoryChangeCodec,
  ShardDirectoryChannel,
  type ShardDirectoryChangeHandler,
  type ShardDirectoryChanged,
} from '@platform/sharding';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';
import type {
  ValkeyMessageListener,
  ValkeySubscriberConnection,
} from './valkey-subscriber-connection.js';
import type { ValkeySubscriberSource } from './valkey-subscriber-source.js';
import { ValkeyUnexpectedReplyError } from './valkey-unexpected-reply.error.js';

/**
 * `ShardingEvent.ShardDirectoryChanged` on Valkey pub/sub. Delivery
 * is at most once and only to the processes connected at that moment, which
 * is what a cache invalidation needs: a process that misses a message
 * still finds the tombstone in the shared cache and drops its copy when
 * `localTtlMs` expires. The messaging bus can implement the same ports
 * when durable delivery is wanted.
 *
 * The channel is `<prefix>:sharding:directory-changed`: one per service keeps them
 * separate and stays inside the `&<prefix>:*` channel ACL of the
 * service user. Malformed messages and handler failures
 * go to `onError` and never stop the channel.
 */
export class ValkeyShardDirectoryChannel extends ShardDirectoryChannel {
  private readonly channel: string;
  private readonly handlers = new Set<ShardDirectoryChangeHandler>();
  private readonly listener: ValkeyMessageListener;
  private subscription: ValkeySubscriberConnection | undefined;

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly subscribers: ValkeySubscriberSource,
    keyspace: ValkeyKeyspace,
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {
    super();
    this.channel = keyspace.key('sharding', 'directory-changed');
    this.listener = (channel, message) => this.deliver(channel, message);
  }

  async publish(event: ShardDirectoryChanged): Promise<void> {
    await this.executor.run(ValkeyCommand.Publish, [
      this.channel,
      ShardDirectoryChangeCodec.encode(event),
    ]);
  }

  /**
   * It is wrapped so the same handler can be subscribed twice and unsubscribed only once.
   */
  async subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>> {
    const entry: ShardDirectoryChangeHandler = (event) => handler(event);
    const first = this.handlers.size === 0;
    this.handlers.add(entry);
    if (first) {
      try {
        await this.listen();
      } catch (error) {
        this.handlers.delete(entry);
        throw error;
      }
    }
    return async () => {
      if (!this.handlers.delete(entry) || this.handlers.size > 0) {
        return;
      }
      await this.stopListening();
    };
  }

  private async listen(): Promise<void> {
    const connection = await this.subscribers.connection();
    connection.on('message', this.listener);
    try {
      await connection.subscribe(this.channel);
    } catch (error) {
      connection.off('message', this.listener);
      throw error;
    }
    this.subscription = connection;
  }

  private async stopListening(): Promise<void> {
    const connection = this.subscription;
    this.subscription = undefined;
    if (connection === undefined) {
      return;
    }
    connection.off('message', this.listener);
    await connection.unsubscribe(this.channel);
  }

  private deliver(channel: string, message: string): void {
    if (channel !== this.channel) {
      return;
    }
    const event = ShardDirectoryChangeCodec.decode(message);
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
