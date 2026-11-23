import {
  EmailTemplate,
  NotificationsErrorCode,
  TemplateParameter,
} from '@contracts/notifications';
import {
  ConfigLoader,
  ConfigRegistry,
  RegistryAppConfig,
} from '@platform/config';
import {
  Redactor,
  RequestContextStore,
  Tracing,
} from '@platform/observability';
import {
  EmailLedger,
  EmailStatus,
  type EmailRecord,
} from '../../domain/email-ledger.js';
import { EmailSender } from '../../domain/email-sender.js';
import type { OutgoingEmail } from '../../domain/outgoing-email.js';
import { RecipientFingerprint } from '../../domain/recipient-fingerprint.js';
import { EmailTemplates } from '../../domain/templates/email-templates.js';
import { SendEmail } from '../send-email.use-case.js';

class InMemoryLedger extends EmailLedger {
  readonly records = new Map<string, EmailRecord>();
  readonly suppressed = new Set<string>();

  async find(messageId: string) {
    return this.records.get(messageId);
  }

  async record(entry: EmailRecord) {
    this.records.set(entry.messageId, entry);
  }

  async isSuppressed(hash: string) {
    return this.suppressed.has(hash);
  }

  async suppress(hash: string) {
    this.suppressed.add(hash);
  }
}

class LowercaseFingerprint extends RecipientFingerprint {
  of(address: string): string {
    return `fp:${address.toLowerCase()}`;
  }
}

class RecordingSender extends EmailSender {
  readonly sent: OutgoingEmail[] = [];

  async send(email: OutgoingEmail): Promise<string> {
    this.sent.push(email);
    return `provider-${this.sent.length}`;
  }
}

class FailingSender extends EmailSender {
  async send(): Promise<string> {
    throw new Error('smtp down');
  }
}

const registry = new ConfigRegistry();
registry.setRoot({ NOTIFICATIONS_FROM_ADDRESS: 'no-reply@example.com' });
const config = new RegistryAppConfig(new ConfigLoader({}), registry);

const request = {
  messageId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9d01',
  template: EmailTemplate.MfaCode,
  to: 'Ana@Example.com',
  locale: 'es',
  parameters: new Map([[TemplateParameter.Code, '482913']]),
};

const setup = (sender: EmailSender = new RecordingSender()) => {
  const ledger = new InMemoryLedger();
  const send = new SendEmail(
    sender,
    ledger,
    new LowercaseFingerprint(),
    new EmailTemplates(),
    new RequestContextStore(new Tracing(new Redactor())),
    config,
  );
  return { send, ledger, sender };
};

describe('SendEmail', () => {
  it('renders the template, sends it from the service address and records only its fingerprint', async () => {
    const { send, ledger, sender } = setup();

    await send.send(request);

    expect((sender as RecordingSender).sent).toEqual([
      expect.objectContaining({
        from: 'no-reply@example.com',
        to: 'Ana@Example.com',
        text: expect.stringContaining('482913'),
      }),
    ]);
    expect(ledger.records.get(request.messageId)).toMatchObject({
      status: EmailStatus.Sent,
      recipientHash: 'fp:ana@example.com',
      template: EmailTemplate.MfaCode,
    });
  });

  it('does not send twice the same message', async () => {
    const { send, sender } = setup();
    const first = await send.send(request);

    const second = await send.send(request);

    expect(second).toBe(first);
    expect((sender as RecordingSender).sent).toHaveLength(1);
  });

  it('refuses a suppressed recipient', async () => {
    const { send, ledger } = setup();
    ledger.suppressed.add('fp:ana@example.com');

    await expect(send.send(request)).rejects.toMatchObject({
      code: NotificationsErrorCode.EmailRecipientSuppressed,
    });
  });

  it('refuses an unknown template', async () => {
    const { send } = setup();

    await expect(
      send.send({ ...request, template: 'birthday' }),
    ).rejects.toMatchObject({
      code: NotificationsErrorCode.EmailTemplateUnknown,
    });
  });

  it('records the failure and lets the caller retry', async () => {
    const { send, ledger } = setup(new FailingSender());

    await expect(send.send(request)).rejects.toThrow('smtp down');
    expect(ledger.records.get(request.messageId)?.status).toBe(
      EmailStatus.Failed,
    );
  });
});
