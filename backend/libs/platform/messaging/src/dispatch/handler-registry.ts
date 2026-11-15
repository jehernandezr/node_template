import type { z } from 'zod';
import type {
  MessageDefinition,
  MessageOutput,
} from '../contracts/message-contract.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessagingError } from '../errors/messaging-error.js';
import { MessagingErrorCode } from '../errors/messaging-error-code.enum.js';
import type { MessageHandler } from './message-handler.js';

/** Entrega cuyo payload pasó el contrato, lista para correr su manejador. */
export interface PreparedDelivery {
  readonly envelope: MessageEnvelope;
  readonly run: () => void | Promise<void>;
}

/** Manejador registrado, atado al esquema de su contrato. */
export interface Registration {
  /** Valida `data` con el contrato; un `string` es el mensaje del error de validación. */
  prepare(envelope: MessageEnvelope): PreparedDelivery | string;
}

/** Manejadores por tipo de mensaje. Un manejador por tipo. */
export class HandlerRegistry {
  private readonly registrations = new Map<string, Registration>();

  /**
   * @throws MessagingError `DuplicateHandler` si el tipo ya tiene manejador.
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

  /** Registro del tipo, o `undefined` si nadie lo atiende. */
  find(type: string): Registration | undefined {
    return this.registrations.get(type);
  }

  /** Ata el esquema del contrato al manejador: el payload llega ya parseado. */
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
