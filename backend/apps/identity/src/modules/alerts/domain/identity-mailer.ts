import type { OutgoingEmail } from './outgoing-email.js';

/** Sends identity's transactional email. The real adapter delegates to the `notifications` service. */
export abstract class IdentityMailer {
  abstract send(email: OutgoingEmail): Promise<void>;
}
