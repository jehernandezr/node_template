import {
  SESv2Client,
  SendEmailCommand,
  type SendEmailCommandInput,
} from '@aws-sdk/client-sesv2';
import { FakeSnsClient } from './fake-sns-client.js';
import {
  SdkResponderTable,
  type SdkCommand,
  type SdkCommandClass,
} from './sdk-responder-table.js';

/** Fake `SESv2Client`: stores each sent email and responds with what was registered, or its own `MessageId`. */
export class FakeSesClient extends SESv2Client {
  closes = 0;
  private readonly table = new SdkResponderTable();
  private requests = 0;

  constructor() {
    super({ region: 'us-east-1', credentials: FakeSnsClient.CREDENTIALS });
  }

  /** The emails requested from SES, in order. */
  sentEmails(): SendEmailCommandInput[] {
    return this.table
      .sentOf(SendEmailCommand)
      .map((command) => command.input as SendEmailCommandInput);
  }

  once<I extends object>(
    command: SdkCommandClass<I>,
    responder: (input: I) => unknown,
  ): this {
    this.table.once(command, responder);
    return this;
  }

  override send = (async (command: SdkCommand) => {
    const answer = this.table.respond(command);
    this.requests += 1;
    return answer.found ? answer.value : { MessageId: `ses-${this.requests}` };
  }) as SESv2Client['send'];

  override destroy(): void {
    this.closes += 1;
  }
}
