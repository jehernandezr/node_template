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
 * `ShardingEvent.ShardDirectoryChanged` sobre el pub/sub de Valkey. La entrega
 * es como máximo una vez y solo a los procesos conectados en ese momento, que
 * es lo que pide una invalidación de caché: un proceso que pierde un mensaje
 * igual encuentra la lápida en el caché compartido y suelta su copia al vencer
 * `localTtlMs`. El bus de mensajería puede implementar los mismos puertos
 * cuando se quiere entrega durable.
 *
 * El canal es `<prefijo>:sharding:directory-changed`: uno por servicio los
 * mantiene separados y queda dentro de la ACL de canales `&<prefijo>:*` del
 * usuario del servicio. Los mensajes malformados y las fallas de los handlers
 * van a `onError` y nunca detienen el canal.
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

  async subscribe(
    handler: ShardDirectoryChangeHandler,
  ): Promise<() => Promise<void>> {
    // Se envuelve para poder suscribir el mismo handler dos veces y darlo de baja una sola.
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
