import type { Id } from './id.js';

/** Hecho ocurrido en el dominio, emitido por un agregado. */
export interface DomainEvent<TType extends string = string> {
  id: Id;
  /** Nombre del evento, por ejemplo `identity.user.registered`. Cada agregado fija un enum. */
  type: TType;
  occurredAt: Date;
  aggregateId: string;
  payload: Readonly<Record<string, unknown>>;
}
