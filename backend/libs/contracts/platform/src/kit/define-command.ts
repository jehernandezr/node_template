import type { z } from 'zod';
import { MessageKind } from '../enums/message-kind.enum.js';
import {
  defineMessage,
  type MessageDefinition,
  type MessageSpec,
} from './message-definition.js';

/**
 * Comando: pedido de trabajo a un servicio concreto. Lo declara el servicio que
 * lo atiende y llega a una de sus colas; quien lo envía lo declara en `sends`.
 */
export type CommandDefinition<P extends z.ZodType = z.ZodType> =
  MessageDefinition<MessageKind.Command, P>;

export type CommandSpec<P extends z.ZodType> = MessageSpec<P>;

/**
 * Declara un comando. El tipo es `servicio.entidad.verbo.vN`, con el mismo
 * formato y la misma regla de versiones que los eventos.
 */
export function defineCommand<P extends z.ZodType>(
  spec: CommandSpec<P>,
): CommandDefinition<P> {
  return defineMessage(
    MessageKind.Command,
    'Comando',
    'servicio.entidad.verbo.vN',
    spec,
  );
}

/** Tipo del payload de un comando. */
export type CommandPayload<C extends CommandDefinition> = z.output<
  C['payload']
>;
