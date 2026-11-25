import { Entity } from './entity.js';
import type { DomainEvent } from './domain-event.js';
import type { Id } from './ids/id.js';

/** Aggregate root: accumulates domain events until they are collected. */
export abstract class AggregateRoot<
  TId extends Id = Id,
  TEvent extends DomainEvent = DomainEvent,
> extends Entity<TId> {
  private domainEvents: TEvent[] = [];

  /** Records a domain event produced by the aggregate. */
  protected addDomainEvent(event: TEvent): void {
    this.domainEvents.push(event);
  }

  /** Returns the pending events and empties the list. */
  pullDomainEvents(): TEvent[] {
    const events = this.domainEvents;
    this.domainEvents = [];
    return events;
  }
}
