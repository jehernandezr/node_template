import { SystemClock } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { SmtpEmailSenderFactory } from '../../infrastructure/senders/smtp-email-sender-factory.js';
import type {
  SmtpEmailSender,
  SmtpEndpoint,
} from '../../infrastructure/senders/smtp-email-sender.js';

/** `SmtpEmailSenderFactory` that records each endpoint it is asked for. */
export class RecordingSmtpEmailSenderFactory extends SmtpEmailSenderFactory {
  readonly endpoints: SmtpEndpoint[] = [];

  constructor() {
    super(new SequentialIdGenerator(), new SystemClock());
  }

  /** Records `endpoint` and returns a real sender for it. */
  override create(endpoint: SmtpEndpoint): SmtpEmailSender {
    this.endpoints.push(endpoint);
    return super.create(endpoint);
  }
}
