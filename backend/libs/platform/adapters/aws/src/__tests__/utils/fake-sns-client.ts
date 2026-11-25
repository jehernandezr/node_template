import { SNSClient } from '@aws-sdk/client-sns';
import {
  SdkResponderTable,
  type SdkCommand,
  type SdkCommandClass,
} from './sdk-responder-table.js';

/**
 * Fake `SNSClient`: responds with what was registered per command class (`{}` if
 * there is none) and counts the closes.
 */
export class FakeSnsClient extends SNSClient {
  /** Times `destroy()` was called. */
  closes = 0;
  private readonly table = new SdkResponderTable();

  /** Fixed credentials: so nothing queries the SDK's default chain. */
  static readonly CREDENTIALS = {
    accessKeyId: 'AKIDFAKE',
    secretAccessKey: 'fake-secret',
  };

  constructor() {
    super({ region: 'us-east-1', credentials: FakeSnsClient.CREDENTIALS });
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

  // Same reason as `FakeSqsClient.send`: the only cast in the class.
  override send = (async (command: SdkCommand) => {
    const answer = this.table.respond(command);
    return answer.found ? answer.value : {};
  }) as SNSClient['send'];

  override destroy(): void {
    this.closes += 1;
  }
}
