import {
  MessageKind,
  type CommandDefinition,
  type EventDefinition,
  type MessageDefinition,
} from '@contracts/platform';
import type { z } from 'zod';

/**
 * Los contratos de mensajes son los del kit de `@contracts/platform`
 * (`defineEvent` y `defineCommand`). Se reexportan aquí para que messaging
 * tenga un solo punto de entrada.
 */
export { MessageKind };
export type { CommandDefinition, EventDefinition, MessageDefinition };

/** Payload que acepta un contrato al publicar o enviar (antes de los valores por defecto de zod). */
export type MessageInput<M extends MessageDefinition> = z.input<M['schema']>;

/** Payload validado que recibe un manejador. */
export type MessageOutput<M extends MessageDefinition> = z.output<M['schema']>;
