import { EventEmitter } from 'node:events';
import type { ValkeyArgument } from '../../valkey-argument.js';
import type { ValkeyCommandRunner } from '../../valkey-command-runner.js';
import type {
  ValkeyConnectionOpener,
  ValkeyMessageListener,
  ValkeySubscriberClient,
} from '../../valkey-subscriber-connection.js';

/**
 * Servidor de pub/sub falso: un `PUBLISH` del publicador emite `message` en el
 * suscriptor, si está suscrito al canal. Cuenta las conexiones que abre y cierra.
 */
export class FakePubSubBroker {
  readonly subscribed = new Set<string>();
  opened = 0;
  quits = 0;
  disconnects = 0;
  /** Si es `true`, `quit` falla, como un servidor que no responde. */
  quitFails = false;
  /** Falla que lanza `subscribe` una vez. */
  subscribeFailure: Error | undefined;

  private readonly emitter = new EventEmitter();

  /** @param log Bitácora compartida con otros dobles, para comprobar el orden de los cierres. */
  constructor(private readonly log: string[] = []) {}

  /** Cliente que publica: cada comando `PUBLISH` llega a los suscriptores. */
  readonly publisher: ValkeyCommandRunner = {
    call: async (_command: string, args: ValkeyArgument[]) => {
      const [channel, message] = args.map(String);
      if (this.subscribed.has(channel)) {
        this.emit(channel, message);
      }
      return 1;
    },
  };

  /** Quien abre las conexiones suscriptoras. */
  readonly opener: ValkeyConnectionOpener = {
    create: async () => {
      this.opened += 1;
      return this.client();
    },
  };

  /** Emite un mensaje como si el servidor lo hubiera entregado, sin pasar por el suscriptor. */
  emit(channel: string, message: string): void {
    this.emitter.emit('message', channel, message);
  }

  private client(): ValkeySubscriberClient {
    return {
      subscribe: async (...channels: string[]) => {
        const failure = this.subscribeFailure;
        if (failure !== undefined) {
          this.subscribeFailure = undefined;
          throw failure;
        }
        channels.forEach((channel) => this.subscribed.add(channel));
      },
      unsubscribe: async (...channels: string[]) => {
        channels.forEach((channel) => this.subscribed.delete(channel));
      },
      on: (_event: 'message', listener: ValkeyMessageListener) =>
        this.emitter.on('message', listener),
      off: (_event: 'message', listener: ValkeyMessageListener) =>
        this.emitter.off('message', listener),
      quit: async () => {
        this.quits += 1;
        this.log.push('subscriber quit');
        if (this.quitFails) {
          throw new Error('Connection is closed.');
        }
      },
      disconnect: () => {
        this.disconnects += 1;
      },
    };
  }
}
