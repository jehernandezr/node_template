import { ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import {
  SdkResponderTable,
  type SdkCommand,
  type SdkCommandClass,
} from './sdk-responder-table.js';

/**
 * Fake `SQSClient`: responds with what was registered per command class and counts
 * the closes. A command without a response returns `{}`, except `ReceiveMessage`,
 * which mimics long polling: it waits until the caller aborts.
 */
export class FakeSqsClient extends SQSClient {
  /** Times `destroy()` was called. */
  closes = 0;
  /** `ReceiveMessage` calls still waiting (unclosed long polling). */
  pendingReceives = 0;
  /** `pendingReceives` at the moment of `destroy()`, or `undefined` if it was not closed. */
  pendingReceivesAtClose: number | undefined;
  private readonly table = new SdkResponderTable();

  /** Fixed credentials: so nothing queries the SDK's default chain. */
  static readonly CREDENTIALS = {
    accessKeyId: 'AKIDFAKE',
    secretAccessKey: 'fake-secret',
  };

  constructor() {
    super({ region: 'us-east-1', credentials: FakeSqsClient.CREDENTIALS });
  }

  get sent(): readonly SdkCommand[] {
    return this.table.sent;
  }

  on<I extends object>(
    command: SdkCommandClass<I>,
    responder: (input: I) => unknown,
  ): this {
    this.table.on(command, responder);
    return this;
  }

  /** One-time response; afterwards it goes back to the `on` one or the default. */
  once<I extends object>(
    command: SdkCommandClass<I>,
    responder: (input: I) => unknown,
  ): this {
    this.table.once(command, responder);
    return this;
  }

  sentOf<I extends object>(command: SdkCommandClass<I>): SdkCommand[] {
    return this.table.sentOf(command);
  }

  // The SDK declares `send` with generic overloads that a derived class cannot
  // override; this is the only cast, and it pins the type to the original's.
  override send = (async (
    command: SdkCommand,
    options?: { abortSignal?: AbortSignal },
  ) => {
    const answer = this.table.respond(command);
    if (answer.found) {
      return answer.value;
    }
    if (command instanceof ReceiveMessageCommand) {
      return this.waitForAbort(options?.abortSignal);
    }
    return {};
  }) as SQSClient['send'];

  override destroy(): void {
    this.closes += 1;
    this.pendingReceivesAtClose = this.pendingReceives;
  }

  private waitForAbort(signal: AbortSignal | undefined): Promise<never> {
    return new Promise((_resolve, reject) => {
      this.pendingReceives += 1;
      const abort = (): void => {
        this.pendingReceives -= 1;
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      };
      if (signal === undefined || signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener('abort', abort, { once: true });
    });
  }
}
