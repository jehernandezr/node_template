import type { z } from 'zod';
import type { MessageKind } from '../enums/message-kind.enum.js';
import { ContractDefinitionError } from './contract-definition-error.js';

/**
 * Mensaje asíncrono declarado en un contrato: evento o comando.
 *
 * Tiene la forma que usa `@platform/messaging` (`type`, `kind` y `schema`), así
 * `MessageBus.publish`, `MessageBus.send`, `MessageDispatcher.register` y
 * `Route.event`/`Route.command` pueden recibir el descriptor tal cual.
 */
export interface MessageDefinition<
  K extends MessageKind = MessageKind,
  P extends z.ZodType = z.ZodType,
> {
  /** Tipo CloudEvents con la versión al final, por ejemplo `identity.session.revoked.v1`. */
  readonly type: string;
  readonly kind: K;
  /** Versión del payload, tomada del sufijo `.vN` de `type`. */
  readonly version: number;
  /** Esquema del campo `data` del sobre CloudEvents. */
  readonly payload: P;
  /** El mismo esquema que `payload`, con el nombre que espera `@platform/messaging`. */
  readonly schema: P;
  readonly description: string;
}

/** Datos que se escriben al declarar un mensaje. */
export interface MessageSpec<P extends z.ZodType> {
  readonly type: string;
  readonly payload: P;
  readonly description: string;
}

/** `servicio.entidad.acción.vN`: al menos tres segmentos y la versión. */
const MESSAGE_TYPE =
  /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9_-]*){2,}\.v([1-9][0-9]*)$/;

/** Construye el descriptor congelado de un mensaje después de validar su tipo. */
export function defineMessage<K extends MessageKind, P extends z.ZodType>(
  kind: K,
  label: string,
  shape: string,
  spec: MessageSpec<P>,
): MessageDefinition<K, P> {
  const match = MESSAGE_TYPE.exec(spec.type);
  if (!match) {
    throw new ContractDefinitionError(
      `${label} ${spec.type}: el tipo debe tener la forma ${shape}`,
    );
  }
  if (!spec.description.trim()) {
    throw new ContractDefinitionError(
      `${label} ${spec.type}: falta la descripción`,
    );
  }
  return Object.freeze({
    type: spec.type,
    kind,
    version: Number(match[2]),
    payload: spec.payload,
    schema: spec.payload,
    description: spec.description,
  });
}

/** Servicio dueño de un mensaje u operación: el primer segmento del id. */
export function serviceOfId(id: string): string {
  return id.slice(0, id.indexOf('.'));
}
