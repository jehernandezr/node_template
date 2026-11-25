import { Injectable } from '@nestjs/common';
import { Subscribe } from '../../subscribe.decorator.js';
import { UserRegisteredV1 } from './user-registered.contract.js';

/** Second consumer of the same contract, to test the handler conflict. */
@Injectable()
export class SecondUserConsumer {
  @Subscribe(UserRegisteredV1)
  handle(): void {
    // Only the decorator matters: the conflict happens at registration.
  }
}
