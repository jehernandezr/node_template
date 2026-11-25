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
import { FixedClock } from '@platform/kernel/test-utils';
import { SilentLogger } from '@platform/messaging/test-utils';
import {
  EmailLedger,
  EmailReservationKind,
  EmailStatus,
  type EmailRecord,
  type EmailReservation,
} from '../../domain/email-ledger.js';
import { EmailSender } from '../../domain/email-sender.js';
import { LedgerRetryWait } from '../../domain/ledger-retry-wait.js';
import type { OutgoingEmail } from '../../domain/outgoing-email.js';
import { RecipientFingerprint } from '../../domain/recipient-fingerprint.js';
import { EmailTemplates } from '../../domain/templates/email-templates.js';
import { NotificationsSettings } from '../../../../config/notifications-settings.js';
import { SendEmail } from '../send-email.use-case.js';

class InMemoryLedger extends EmailLedger {
  readonly records = new Map<string, EmailRecord>();
  readonly suppressed = new Set<string>();
  readonly reservedAt = new Map<string, Date>();
  recordFailures = 0;
  downUntil = new Date(0);

  constructor(private readonly clock: FixedClock) {
    super();
  }

  async find(messageId: string) {
    return this.records.get(messageId);
  }

  async reserve(
    entry: Omit<EmailRecord, 'status' | 'providerId'>,
    abandonedAfterMs: number,
  ): Promise<EmailReservation> {
    const current = this.records.get(entry.messageId);
    const reservedAt = this.reservedAt.get(entry.messageId);
    const abandoned =
      current?.status === EmailStatus.Sending &&
      reservedAt !== undefined &&
      this.clock.now().getTime() - reservedAt.getTime() > abandonedAfterMs;
    if (
      current !== undefined &&
      current.status !== EmailStatus.Failed &&
      !abandoned
    ) {
      return { kind: EmailReservationKind.Taken, current };
    }
    this.records.set(entry.messageId, {
      ...entry,
      status: EmailStatus.Sending,
    });
    this.reservedAt.set(entry.messageId, this.clock.now());
    return { kind: EmailReservationKind.Reserved };
  }

  async record(entry: EmailRecord) {
    if (this.clock.now().getTime() < this.downUntil.getTime()) {
      throw new Error('catalog down');
    }
    if (this.recordFailures > 0) {
      this.recordFailures -= 1;
      throw new Error('catalog down');
    }
    this.records.set(entry.messageId, entry);
  }

  async isSuppressed(hash: string) {
    return this.suppressed.has(hash);
  }

  async suppress(hash: string) {
    this.suppressed.add(hash);
  }
}

class ClockAdvancingRetryWait extends LedgerRetryWait {
  static readonly STEP_MS = 1_000;

  readonly waited: number[] = [];

  constructor(private readonly clock: FixedClock) {
    super();
  }

  async before(retry: number): Promise<void> {
    this.waited.push(retry);
    this.clock.advance(ClockAdvancingRetryWait.STEP_MS);
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

class GatedSender extends RecordingSender {
  private open: () => void = () => undefined;
  private readonly gate = new Promise<void>((resolve) => {
    this.open = resolve;
  });

  override async send(email: OutgoingEmail): Promise<string> {
    await this.gate;
    return super.send(email);
  }

  release(): void {
    this.open();
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
  const clock = new FixedClock(new Date('2026-11-20T10:00:00.000Z'));
  const ledger = new InMemoryLedger(clock);
  const retryWait = new ClockAdvancingRetryWait(clock);
  const send = new SendEmail(
    sender,
    ledger,
    new LowercaseFingerprint(),
    new EmailTemplates(),
    new RequestContextStore(new Tracing(new Redactor())),
    new SilentLogger(),
    retryWait,
    new NotificationsSettings(config),
  );
  return { send, ledger, sender, clock, retryWait };
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

  it('sends once when the same message arrives twice at once and tells the second to retry', async () => {
    const sender = new GatedSender();
    const { send } = setup(sender);

    const first = send.send(request);
    const second = send.send(request);
    await expect(second).rejects.toMatchObject({
      code: NotificationsErrorCode.EmailInProgress,
    });
    sender.release();

    await expect(first).resolves.toBe('provider-1');
    await expect(send.send(request)).resolves.toBe('provider-1');
    expect(sender.sent).toHaveLength(1);
  });

  it('keeps a sent email sent when the ledger fails afterwards', async () => {
    const { send, ledger, sender } = setup();
    ledger.recordFailures = Number.POSITIVE_INFINITY;

    await expect(send.send(request)).resolves.toBe('provider-1');
    await expect(send.send(request)).rejects.toMatchObject({
      code: NotificationsErrorCode.EmailInProgress,
    });
    expect((sender as RecordingSender).sent).toHaveLength(1);
  });

  it('records a sent email on a second try, so a retry after the abandonment window does not send it again', async () => {
    const { send, ledger, sender, clock } = setup();
    ledger.recordFailures = 1;
    await send.send(request);
    clock.advance(SendEmail.ABANDONED_AFTER_MS + 1);

    await expect(send.send(request)).resolves.toBe('provider-1');
    expect((sender as RecordingSender).sent).toHaveLength(1);
  });

  it('waits between tries to record a sent email, so a ledger outage shorter than the waits does not lose the record', async () => {
    const { send, ledger, clock, retryWait } = setup();
    ledger.downUntil = new Date(
      clock.now().getTime() + 1.5 * ClockAdvancingRetryWait.STEP_MS,
    );

    await send.send(request);

    expect(retryWait.waited).toEqual([1, 2]);
    expect(ledger.records.get(request.messageId)?.status).toBe(
      EmailStatus.Sent,
    );
  });

  it('sends again after the abandonment window when the ledger never recorded the first send', async () => {
    const { send, ledger, sender, clock } = setup();
    ledger.recordFailures = Number.POSITIVE_INFINITY;
    await send.send(request);
    ledger.recordFailures = 0;
    clock.advance(SendEmail.ABANDONED_AFTER_MS + 1);

    await expect(send.send(request)).resolves.toBe('provider-2');
    expect((sender as RecordingSender).sent).toHaveLength(2);
  });

  it('takes over a reservation abandoned by a process that crashed', async () => {
    const { send, ledger, sender, clock } = setup();
    await ledger.reserve(
      {
        messageId: request.messageId,
        template: EmailTemplate.MfaCode,
        templateVersion: 1,
        recipientHash: 'fp:ana@example.com',
      },
      SendEmail.ABANDONED_AFTER_MS,
    );
    clock.advance(SendEmail.ABANDONED_AFTER_MS + 1);

    await expect(send.send(request)).resolves.toBe('provider-1');
    expect((sender as RecordingSender).sent).toHaveLength(1);
  });

  it('refuses a mandatory parameter that is missing instead of sending a blank code', async () => {
    const { send, sender } = setup();

    await expect(
      send.send({ ...request, parameters: new Map() }),
    ).rejects.toMatchObject({
      code: NotificationsErrorCode.EmailTemplateParameterMissing,
    });
    expect((sender as RecordingSender).sent).toEqual([]);
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
