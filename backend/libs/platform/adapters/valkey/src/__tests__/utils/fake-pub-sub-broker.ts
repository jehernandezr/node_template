import { EventEmitter } from 'node:events';
import type { ValkeyArgument } from '../../valkey-argument.js';
import type { ValkeyCommandRunner } from '../../valkey-command-runner.js';
import type {
  ValkeyConnectionOpener,
  ValkeyMessageListener,
  ValkeySubscriberClient,
} from '../../valkey-subscriber-connection.js';

/**
 * Fake pub/sub server: a `PUBLISH` from the publisher emits `message` on the
 * subscriber, if it is subscribed to the channel. Counts the connections it opens and closes.
 */
export class FakePubSubBroker {
  readonly subscribed = new Set<string>();
  opened = 0;
  quits = 0;
  disconnects = 0;
  /** Whether `quit` fails, like a server that does not respond. */
  quitFails = false;
  /** Failure that `subscribe` throws once. */
  subscribeFailure: Error | undefined;

  private readonly emitter = new EventEmitter();

  /** @param log Log shared with other doubles, to check the order of the closes. */
  constructor(private readonly log: string[] = []) {}

  /** Publishing client: each `PUBLISH` command reaches the subscribers. */
  readonly publisher: ValkeyCommandRunner = {
    call: async (_command: string, args: ValkeyArgument[]) => {
      const [channel, message] = args.map(String);
      if (this.subscribed.has(channel)) {
        this.emit(channel, message);
      }
      return 1;
    },
  };

  /** Opener of the subscriber connections. */
  readonly opener: ValkeyConnectionOpener = {
    create: async () => {
      this.opened += 1;
      return this.client();
    },
  };

  /** Emits a message as if the server had delivered it, bypassing the subscriber. */
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
