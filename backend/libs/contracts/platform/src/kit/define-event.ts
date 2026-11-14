import type { z } from 'zod';
import { MessageKind } from '../enums/message-kind.enum.js';
import {
  defineMessage,
  type MessageDefinition,
  type MessageSpec,
} from './message-definition.js';

/** Evento publicado por un servicio (CloudEvents): un hecho que ya pasó. */
export type EventDefinition<P extends z.ZodType = z.ZodType> =
  MessageDefinition<MessageKind.Event, P>;

export type EventSpec<P extends z.ZodType> = MessageSpec<P>;

/**
 * Declara un evento. El tipo es `servicio.entidad.hecho.vN` y el sufijo `.vN`
 * es la versión del payload. El servicio lo publica en uno de sus tópicos.
 */
export function defineEvent<P extends z.ZodType>(
  spec: EventSpec<P>,
): EventDefinition<P> {
  return defineMessage(
    MessageKind.Event,
    'Evento',
    'servicio.entidad.hecho.vN',
    spec,
  );
}

/** Tipo del payload de un evento. */
export type EventPayload<E extends EventDefinition> = z.output<E['payload']>;
