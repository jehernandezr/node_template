import type { Recipient } from './recipient.js';

/** A user's contact data, according to identity. */
export abstract class RecipientDirectory {
  /** `undefined` if the user does not exist or was already deleted: there is no one to notify. */
  abstract find(userId: string): Promise<Recipient | undefined>;
}
