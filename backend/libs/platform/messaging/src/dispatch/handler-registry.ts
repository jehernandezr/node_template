import type { z } from 'zod';
import type {
  MessageDefinition,
  MessageOutput,
} from '../contracts/message-contract.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import type { MessageHandler } from './message-handler.js';

/** Delivery whose payload passed the contract, ready to run its handler. */
export interface PreparedDelivery {
  readonly envelope: MessageEnvelope;
  readonly run: () => void | Promise<void>;
}

/** Registered handler, bound to the schema of its contract. */
export interface Registration {
  /** Validates `data` with the contract; a `string` is the validation error message. */
  prepare(envelope: MessageEnvelope): PreparedDelivery | string;
}

/** Handlers by message type. One handler per type. */
export class HandlerRegistry {
  private readonly registrations = new Map<string, Registration>();

  /**
   * Registers the handler of a message type.
   * @param contract Message contract.
   * @param handler Handler.
   * @throws MessagingError `DuplicateHandler` if the type already has a handler.
   */
  register<M extends MessageDefinition>(
    contract: M,
    handler: MessageHandler<MessageOutput<M>>,
  ): void {
    if (this.registrations.has(contract.type)) {
      throw new MessagingError(
        MessagingErrorCode.DuplicateHandler,
        `a handler is already registered for type "${contract.type}"`,
      );
    }
    this.registrations.set(
      contract.type,
      this.bind<M['schema']>(contract.schema, handler),
    );
  }

  /**
   * Registration of the type, or `undefined` if nobody handles it.
   * @param type Message type.
   * @returns The registration, or `undefined`.
   */
  find(type: string): Registration | undefined {
    return this.registrations.get(type);
  }

  /** Binds the contract schema to the handler: the payload arrives already parsed. */
  private bind<S extends z.ZodType>(
    schema: S,
    handler: MessageHandler<z.output<S>>,
  ): Registration {
    return {
      prepare(envelope) {
        const parsed = schema.safeParse(envelope.data);
        if (!parsed.success) return parsed.error.message;
        const validated: MessageEnvelope<z.output<S>> = {
          ...envelope,
          data: parsed.data,
        };
        return {
          envelope: validated,
          run: () => handler(parsed.data, validated),
        };
      },
    };
  }
}
