import type { UserRef } from '@contracts/platform';
import type { PushMessage } from '../domain/push-message.js';
import type { PushOutcome } from '../domain/push-outcome.enum.js';

/** Push for the other modules. */
export abstract class PushFacade {
  /**
   * Sends to each of the user's devices.
   * @param user Recipient.
   * @param message Push title and body.
   * @returns `Skipped` if the sender delivered to none of the user's devices, otherwise `Sent`.
   */
  abstract deliver(user: UserRef, message: PushMessage): Promise<PushOutcome>;
}
