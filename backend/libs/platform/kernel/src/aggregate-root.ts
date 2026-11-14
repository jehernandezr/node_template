import { Entity } from './entity.js';
import type { DomainEvent } from './domain-event.js';
import type { Id } from './id.js';

/** Raíz de agregado: acumula eventos de dominio hasta que se recogen. */
export abstract class AggregateRoot<
  TId extends Id = Id,
  TEvent extends DomainEvent = DomainEvent,
> extends Entity<TId> {
  private domainEvents: TEvent[] = [];

  /** Registra un evento de dominio producido por el agregado. */
  protected addDomainEvent(event: TEvent): void {
    this.domainEvents.push(event);
  }

  /** Devuelve los eventos pendientes y vacía la lista. */
  pullDomainEvents(): TEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
}
