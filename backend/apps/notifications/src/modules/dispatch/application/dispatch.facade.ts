import type { NotificationChannel } from '@contracts/notifications';
import type { NotifyCommand } from './notify-command.js';

/** The single entry point for notifications: the type sets the criticality and the preferences, the channels. */
export abstract class DispatchFacade {
  /** Returns the channels it went out through; empty if the user no longer exists. */
  abstract notify(
    command: NotifyCommand,
  ): Promise<readonly NotificationChannel[]>;
}
