import { z } from 'zod';
import type { CommandDefinition } from './define-command.js';
import { defineCommand } from './define-command.js';
import { defineEvent } from './define-event.js';
import type { TopicDefinition } from './define-messaging.js';
import { defineTopic } from './define-messaging.js';

export interface TopicReferenceSpec {
  /** Nombre del tópico del servicio dueño. */
  readonly name: string;
  readonly fifo?: boolean;
  /** Tipos de los eventos del tópico que esta referencia nombra. */
  readonly events: readonly string[];
  readonly description: string;
}

export interface CommandReferenceSpec {
  /** Tipo del comando que atiende el servicio dueño. */
  readonly type: string;
  readonly description: string;
}

/**
 * Apunta por nombre a un tópico de otro servicio. Sirve cuando el contrato no
 * puede importar al dueño porque éste ya lo importa (dos servicios que se
 * suscriben uno al otro). `contracts-export` comprueba contra el contrato del
 * dueño que el tópico y cada tipo existen. El payload es `unknown`: quien
 * consume el mensaje valida con el evento real del contrato del dueño.
 */
export function defineTopicReference(
  spec: TopicReferenceSpec,
): TopicDefinition {
  return defineTopic({
    name: spec.name,
    fifo: spec.fifo ?? false,
    events: spec.events.map((type) =>
      defineEvent({
        type,
        payload: z.unknown(),
        description: `Referencia al evento ${type} del tópico ${spec.name}.`,
      }),
    ),
    description: spec.description,
  });
}

/**
 * Apunta por tipo a un comando de otro servicio, con el mismo motivo y la misma
 * comprobación de `defineTopicReference`.
 */
export function defineCommandReference(
  spec: CommandReferenceSpec,
): CommandDefinition {
  return defineCommand({
    type: spec.type,
    payload: z.unknown(),
    description: spec.description,
  });
}
