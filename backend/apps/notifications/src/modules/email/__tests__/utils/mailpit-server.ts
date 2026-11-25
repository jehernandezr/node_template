import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  GenericContainer,
  Wait,
  type StartedTestContainer,
} from 'testcontainers';
import type { ReceivedEmail } from './email-sender-contract.js';

interface MailpitAddress {
  readonly Address: string;
}

interface MailpitSummary {
  readonly ID: string;
}

interface MailpitMessage {
  readonly From: MailpitAddress;
  readonly To: readonly MailpitAddress[];
  readonly Subject: string;
  readonly Text: string;
  readonly HTML: string;
}

/**
 * Mailpit in a container: receives over SMTP and exposes what it received through its HTTP API. With its chaos mode it can
 * reject recipients, like a provider that fails for a while.
 */
export class MailpitServer {
  static readonly IMAGE = 'axllent/mailpit:v1.33.1';
  private static readonly SMTP_PORT = 1025;
  private static readonly API_PORT = 8025;
  private static readonly POLL_MS = 100;
  /** SMTP temporary failure response: the sender can retry. */
  private static readonly TEMPORARY_FAILURE = 451;
  private static readonly ALWAYS = 100;
  private static readonly NEVER = 0;

  private container: StartedTestContainer | undefined;

  async start(): Promise<void> {
    this.container = await new GenericContainer(MailpitServer.IMAGE)
      .withExposedPorts(MailpitServer.SMTP_PORT, MailpitServer.API_PORT)
      .withEnvironment({ MP_ENABLE_CHAOS: 'true' })
      .withWaitStrategy(Wait.forHttp('/livez', MailpitServer.API_PORT))
      .withAutoRemove(new ContainerRuntime(process.env).autoCleanup())
      .start();
  }

  async stop(): Promise<void> {
    await this.container?.stop();
  }

  smtpUrl(): string {
    const container = this.started();
    return `smtp://${container.getHost()}:${container.getMappedPort(MailpitServer.SMTP_PORT)}`;
  }

  /** From now on rejects every recipient with a temporary failure. */
  rejectRecipients(): Promise<void> {
    return this.recipientFailures(MailpitServer.ALWAYS);
  }

  /** Accepts all recipients again. */
  acceptRecipients(): Promise<void> {
    return this.recipientFailures(MailpitServer.NEVER);
  }

  /** The received emails, newest to oldest. */
  async received(): Promise<readonly ReceivedEmail[]> {
    const list = (await this.get('/api/v1/messages')) as {
      messages: MailpitSummary[];
    };
    return Promise.all(
      list.messages.map(async (summary) => {
        const message = (await this.get(
          `/api/v1/message/${summary.ID}`,
        )) as MailpitMessage;
        return {
          from: message.From.Address,
          to: message.To[0]?.Address ?? '',
          subject: message.Subject,
          text: message.Text.trim(),
          html: message.HTML.trim(),
        };
      }),
    );
  }

  /** Waits for an email for `to` to arrive, polling the API until `timeoutMs`. */
  async waitForMailTo(to: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!(await this.received()).some((mail) => mail.to === to)) {
      if (Date.now() > deadline) {
        throw new Error(`Mailpit did not receive a mail for ${to}`);
      }
      await new Promise((resolve) =>
        setTimeout(resolve, MailpitServer.POLL_MS),
      );
    }
  }

  private async recipientFailures(probability: number): Promise<void> {
    const response = await fetch(this.apiUrl('/api/v1/chaos'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Recipient: {
          ErrorCode: MailpitServer.TEMPORARY_FAILURE,
          Probability: probability,
        },
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Mailpit rejected the chaos settings: ${response.status}`,
      );
    }
  }

  private async get(path: string): Promise<unknown> {
    const response = await fetch(this.apiUrl(path));
    return response.json();
  }

  private apiUrl(path: string): string {
    const container = this.started();
    return `http://${container.getHost()}:${container.getMappedPort(MailpitServer.API_PORT)}${path}`;
  }

  private started(): StartedTestContainer {
    if (this.container === undefined) {
      throw new Error('MailpitServer no está iniciado');
    }
    return this.container;
  }
}
