import type { UserRef } from '@contracts/platform';
import type { PushMessage } from '../domain/push-message.js';

/** Push for the other modules. */
export abstract class PushFacade {
  /**
   * Sends to each of the user's devices and returns how many accepted it.
   * @param user Recipient.
   * @param message Push title and body.
   * @returns How many devices accepted it.
   */
  abstract deliver(user: UserRef, message: PushMessage): Promise<number>;
}
