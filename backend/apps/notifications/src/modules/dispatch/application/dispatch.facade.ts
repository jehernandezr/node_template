import type { NotificationChannel } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import type { NotifyCommand } from './notify-command.js';

/** The single entry point for notifications: the type sets the criticality and the preferences, the channels. */
export abstract class DispatchFacade {
  /** Returns the channels it went out through; empty if the user no longer exists. */
  abstract notify(
    command: NotifyCommand,
  ): Promise<readonly NotificationChannel[]>;

  /** Deletes the user's deliveries and returns how many there were; repeating it deletes nothing. */
  abstract eraseUser(user: UserRef): Promise<number>;
}
