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
 * `AuthRevocationFeed` sobre el canal `auth:revocations`, con el mismo patrón de
 * `ValkeyShardDirectoryChannel`: una sola suscripción compartida por todos los
 * handlers, los mensajes que no son un `sid` y las fallas de los handlers van a
 * `onError` y nunca detienen el canal. La publicación no está aquí: la hace
 * `ValkeyAuthStateWriter.revokeSession`.
 */
export class ValkeyAuthRevocationFeed extends AuthRevocationFeed {
  /** Largo máximo de un `sid` en el mensaje del canal. */
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
    // Se envuelve para poder suscribir el mismo handler dos veces y darlo de baja una sola.
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
