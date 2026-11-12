import type { z } from 'zod';
import { ContractDefinitionError } from './contract-definition-error.js';

/** Evento publicado por un servicio (CloudEvents). */
export interface EventDefinition<P extends z.ZodType = z.ZodType> {
  /** Tipo CloudEvents con la versión al final, por ejemplo `identity.session.revoked.v1`. */
  readonly type: string;
  /** Versión del payload, tomada del sufijo `.vN` de `type`. */
  readonly version: number;
  readonly payload: P;
  readonly description: string;
}

export interface EventSpec<P extends z.ZodType> {
  readonly type: string;
  readonly payload: P;
  readonly description: string;
}

const EVENT_TYPE = /^[a-z][a-z0-9-]*(\.[a-z][a-z0-9_-]*)+\.v([1-9][0-9]*)$/;

/** Declara un evento. El tipo termina en `.vN`, que es la versión del payload. */
export function defineEvent<P extends z.ZodType>(
  spec: EventSpec<P>,
): EventDefinition<P> {
  const match = EVENT_TYPE.exec(spec.type);
  if (!match) {
    throw new ContractDefinitionError(
      `Evento ${spec.type}: el tipo debe tener la forma servicio.entidad.hecho.vN`,
    );
  }
  if (!spec.description.trim()) {
    throw new ContractDefinitionError(
      `Evento ${spec.type}: falta la descripción`,
    );
  }
  return Object.freeze({
    type: spec.type,
    version: Number(match[2]),
    payload: spec.payload,
    description: spec.description,
  });
}

/** Tipo del payload de un evento. */
export type EventPayload<E extends EventDefinition> = z.output<E['payload']>;
