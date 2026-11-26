import { Injectable } from '@nestjs/common';
import type { NotificationChannel } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import { DispatchFacade } from './dispatch.facade.js';
import { EraseUserDeliveries } from './erase-user-deliveries.use-case.js';
import type { NotifyCommand } from './notify-command.js';
import { NotifyUser } from './notify-user.use-case.js';

/** `DispatchFacade` in process: each method delegates to its use case. */
@Injectable()
export class LocalDispatchFacade extends DispatchFacade {
  constructor(
    private readonly notifyUser: NotifyUser,
    private readonly eraseDeliveries: EraseUserDeliveries,
  ) {
    super();
  }

  /** Notifies the user and returns the channels it went out through. */
  override notify(
    command: NotifyCommand,
  ): Promise<readonly NotificationChannel[]> {
    return this.notifyUser.notify(command);
  }

  /** Deletes the user's deliveries and returns how many there were. */
  override eraseUser(user: UserRef): Promise<number> {
    return this.eraseDeliveries.execute(user);
  }
}
