import { Injectable } from '@nestjs/common';
import type { UserRef } from '@contracts/platform';
import type { PushMessage } from '../domain/push-message.js';
import { PushSender } from '../domain/push-sender.js';
import { PushTargetDirectory } from '../domain/push-target-directory.js';
import { PushFacade } from './push.facade.js';

/** Sends the push to all of the user's registered devices. */
@Injectable()
export class DeliverPush extends PushFacade {
  constructor(
    private readonly targets: PushTargetDirectory,
    private readonly sender: PushSender,
  ) {
    super();
  }

  override async deliver(user: UserRef, message: PushMessage): Promise<number> {
    const targets = await this.targets.targetsOf(user);
    await Promise.all(
      targets.map((target) => this.sender.send(target, message)),
    );
    return targets.length;
  }
}
