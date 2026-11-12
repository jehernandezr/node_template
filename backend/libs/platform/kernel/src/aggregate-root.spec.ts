import { AggregateRoot } from './aggregate-root.js';
import type { DomainEvent } from './domain-event.js';
import type { Id } from './id.js';
import { SequentialIdGenerator } from './testing/sequential-id-generator.js';

class Order extends AggregateRoot {
  constructor(id: Id) {
    super(id);
  }

  place(eventId: Id): void {
    this.addDomainEvent({
      id: eventId,
      type: 'sales.order.placed',
      occurredAt: new Date('2025-01-01T00:00:00Z'),
      aggregateId: this.id.toString(),
      payload: { total: 10 },
    });
  }
}

describe('AggregateRoot', () => {
  const ids = new SequentialIdGenerator();

  it('returns recorded events in order and clears them on pull', () => {
    const order = new Order(ids.next());
    order.place(ids.next());
    order.place(ids.next());

    const first: DomainEvent[] = order.pullDomainEvents();
    expect(first).toHaveLength(2);
    expect(first[0]?.type).toBe('sales.order.placed');
    expect(first[0]?.aggregateId).toBe(order.id.toString());
    expect(order.pullDomainEvents()).toEqual([]);
  });

  it('starts with no events', () => {
    expect(new Order(ids.next()).pullDomainEvents()).toEqual([]);
  });
});
