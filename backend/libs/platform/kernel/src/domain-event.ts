import type { Id } from './id.js';

/** Hecho ocurrido en el dominio, emitido por un agregado. */
export interface DomainEvent {
  id: Id;
  /** Nombre del evento, por ejemplo `identity.user.registered`. */
  type: string;
  occurredAt: Date;
  aggregateId: string;
  payload: Readonly<Record<string, unknown>>;
}
