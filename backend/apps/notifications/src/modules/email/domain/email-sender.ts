import type { OutgoingEmail } from './outgoing-email.js';

/** Provider that delivers the emails. */
export abstract class EmailSender {
  /**
   * Returns the id the provider assigns to the email.
   * @param email Rendered email.
   * @returns The provider id.
   */
  abstract send(email: OutgoingEmail): Promise<string>;

  /** Releases the provider's connections on shutdown; those that keep none do nothing. */
  close(): void {
    return;
  }
}
