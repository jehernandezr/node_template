import type { NotificationChannel } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import type { NotifyCommand } from './notify-command.js';

/** The single entry point for notifications: the type sets the criticality and the preferences, the channels. */
export abstract class DispatchFacade {
  /**
   * Returns the channels it went out through; empty if the user no longer exists.
   * @param command User, type, parameters and idempotency id.
   * @returns The channels used.
   */
  abstract notify(
    command: NotifyCommand,
  ): Promise<readonly NotificationChannel[]>;

  /**
   * Deletes the user's deliveries and returns how many there were; repeating it deletes nothing.
   * @param user User whose deliveries are deleted.
   * @returns How many were deleted.
   */
  abstract eraseUser(user: UserRef): Promise<number>;
}
