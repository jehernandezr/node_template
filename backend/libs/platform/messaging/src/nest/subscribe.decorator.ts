import { SetMetadata } from '@nestjs/common';
import type { MessageDefinition } from '../contracts/message-contract.js';
import { SubscribeMetadata } from './subscribe-metadata.js';

/** Fábrica del decorador `@Subscribe`. */
export class SubscribeDecorator {
  /**
   * Marca un método de una clase `@Injectable()` como manejador del contrato:
   * `(data, envelope) => Promise<void>`. `MessagingExplorer` lo registra en el
   * `MessageDispatcher` al arrancar.
   */
  static create(contract: MessageDefinition): MethodDecorator {
    return SetMetadata(SubscribeMetadata.KEY, contract);
  }
}

/** `@Subscribe(UserRegisteredV1)` sobre el método de un consumidor. */
export const Subscribe = SubscribeDecorator.create;
