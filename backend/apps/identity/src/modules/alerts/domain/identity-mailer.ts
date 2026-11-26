import type { OutgoingEmail } from './outgoing-email.js';

/** Sends identity's transactional email. The real adapter delegates to the `notifications` service. */
export abstract class IdentityMailer {
  /**
   * Sends an identity email: verification, reset, invitation or alert.
   * @param email Template, recipient and parameters.
   */
  abstract send(email: OutgoingEmail): Promise<void>;
}
