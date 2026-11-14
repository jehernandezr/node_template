import {
  MessageKind,
  type CommandDefinition,
  type EventDefinition,
  type MessageDefinition,
} from '@contracts/platform';
import type { z } from 'zod';

/**
 * Los contratos de los mensajes son los del kit de `@contracts/platform`
 * (`defineEvent` y `defineCommand`). Este módulo los reexporta para que el
 * código de mensajería tenga un solo punto de entrada.
 */
export { MessageKind };
export type { CommandDefinition, EventDefinition, MessageDefinition };

/** Payload que acepta un contrato al publicar o enviar (antes de los defaults de zod). */
export type MessageInput<M extends MessageDefinition> = z.input<M['schema']>;

/** Payload ya validado que recibe un handler. */
export type MessageOutput<M extends MessageDefinition> = z.output<M['schema']>;
