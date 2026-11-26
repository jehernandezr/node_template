import type { Clock, IdGenerator } from '@platform/kernel';
import { SmtpEmailSender, type SmtpEndpoint } from './smtp-email-sender.js';

/** Creates the SMTP sender of an endpoint with the service's ids and clock. */
export class SmtpEmailSenderFactory {
  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /** Returns a sender that opens one connection per email to `endpoint`. */
  create(endpoint: SmtpEndpoint): SmtpEmailSender {
    return new SmtpEmailSender(endpoint, this.ids, this.clock);
  }
}
