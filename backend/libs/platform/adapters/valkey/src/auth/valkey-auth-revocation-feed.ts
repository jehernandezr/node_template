import {
  AuthRevocationFeed,
  AuthStateKey,
  type RevocationHandler,
} from '@platform/auth';
import { ValkeyCommand } from '../valkey-command.enum.js';
import type {
  ValkeyMessageListener,
  ValkeySubscriberConnection,
} from '../valkey-subscriber-connection.js';
import type { ValkeySubscriberSource } from '../valkey-subscriber-source.js';
import { ValkeyUnexpectedReplyError } from '../valkey-unexpected-reply.error.js';

/**
 * `AuthRevocationFeed` on the `auth:revocations` channel, with the same pattern as
 * `ValkeyShardDirectoryChannel`: a single subscription shared by all the
 * handlers; messages that are not a `sid` and handler failures go to
 * `onError` and never stop the channel. Publishing is not here: it is done by
 * `ValkeyAuthStateWriter.revokeSession`.
 */
export class ValkeyAuthRevocationFeed extends AuthRevocationFeed {
  /** Maximum length of a `sid` in the channel message. */
  private static readonly MAX_SESSION_ID_LENGTH = 128;

  private readonly handlers = new Set<RevocationHandler>();
  private readonly listener: ValkeyMessageListener;
  private subscription: ValkeySubscriberConnection | undefined;

  constructor(
    private readonly subscribers: ValkeySubscriberSource,
    private readonly onError: (error: unknown) => void = () => undefined,
  ) {
    super();
    this.listener = (channel, message) => this.deliver(channel, message);
  }

  async subscribe(handler: RevocationHandler): Promise<() => Promise<void>> {
    // It is wrapped so the same handler can be subscribed twice and unsubscribed only once.
    const entry: RevocationHandler = (sessionId) => handler(sessionId);
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
      await connection.subscribe(AuthStateKey.REVOCATIONS_CHANNEL);
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
    await connection.unsubscribe(AuthStateKey.REVOCATIONS_CHANNEL);
  }

  private deliver(channel: string, message: string): void {
    if (channel !== AuthStateKey.REVOCATIONS_CHANNEL) {
      return;
    }
    if (
      message === '' ||
      message.length > ValkeyAuthRevocationFeed.MAX_SESSION_ID_LENGTH
    ) {
      this.onError(
        new ValkeyUnexpectedReplyError(ValkeyCommand.Publish, 'a session id'),
      );
      return;
    }
    for (const handler of this.handlers) {
      Promise.resolve()
        .then(() => handler(message))
        .catch((error: unknown) => this.onError(error));
    }
  }
}
