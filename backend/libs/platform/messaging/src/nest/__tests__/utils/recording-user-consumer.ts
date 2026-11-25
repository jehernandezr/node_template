import { Injectable } from '@nestjs/common';
import { Subscribe } from '../../subscribe.decorator.js';
import { UserRegisteredV1 } from './user-registered.contract.js';

/** Test consumer that stores the received ids in an instance field. */
@Injectable()
export class RecordingUserConsumer {
  readonly received: string[] = [];

  @Subscribe(UserRegisteredV1)
  handle(data: { userId: string }): void {
    this.received.push(data.userId);
  }
}
