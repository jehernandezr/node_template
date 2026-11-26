import type { PushTarget } from '@contracts/identity';
import type { UserRef } from '@contracts/platform';

/** A user's devices that accept push, according to identity. */
export abstract class PushTargetDirectory {
  /**
   * Lists the devices that can receive a user's pushes.
   * @param user Recipient.
   * @returns Its push targets.
   */
  abstract targetsOf(user: UserRef): Promise<readonly PushTarget[]>;
}
