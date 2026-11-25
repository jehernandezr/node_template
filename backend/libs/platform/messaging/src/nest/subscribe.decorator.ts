import { SetMetadata } from '@nestjs/common';
import type { MessageDefinition } from '../contracts/message-contract.js';
import { SubscribeMetadata } from './subscribe-metadata.js';

/** Factory of the `@Subscribe` decorator. */
export class SubscribeDecorator {
  /**
   * Marks a method of an `@Injectable()` class as the handler of the contract:
   * `(data, envelope) => Promise<void>`. `MessagingExplorer` registers it in the
   * `MessageDispatcher` at startup.
   */
  static create(contract: MessageDefinition): MethodDecorator {
    return SetMetadata(SubscribeMetadata.KEY, contract);
  }
}

/** `@Subscribe(UserRegisteredV1)` on a consumer method. */
export const Subscribe = SubscribeDecorator.create;
