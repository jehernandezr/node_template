import { FixedClock } from '@platform/kernel/test-utils';
import { ResilienceEventBus } from '../resilience-event-bus.js';
import { ResilienceEventKind } from '../resilience-event-kind.enum.js';
import type { ResilienceEvent } from '../resilience-event.js';

const START = new Date('2025-01-01T00:00:00.000Z');

describe('ResilienceEventBus', () => {
  it('delivers each event with the clock timestamp to every subscriber', () => {
    const bus = new ResilienceEventBus(new FixedClock(START));
    const received: ResilienceEvent[] = [];
    bus.subscribe((event) => {
      received.push(event);
    });
    bus.publish('cache', 'valkey', ResilienceEventKind.Break, {
      errorName: 'Error',
    });
    expect(received).toEqual([
      {
        policy: 'cache',
        dependencyKey: 'valkey',
        kind: ResilienceEventKind.Break,
        at: START.getTime(),
        detail: { errorName: 'Error' },
      },
    ]);
  });

  it('stops delivering to a subscriber after its unsubscribe', () => {
    const bus = new ResilienceEventBus(new FixedClock(START));
    const received: ResilienceEvent[] = [];
    const unsubscribe = bus.subscribe((event) => {
      received.push(event);
    });
    unsubscribe();
    bus.publish('cache', 'valkey', ResilienceEventKind.Reset);
    expect(received).toEqual([]);
  });

  it('absorbs synchronous throws and asynchronous rejections from a listener', () => {
    const bus = new ResilienceEventBus(new FixedClock(START));
    const seen: string[] = [];
    bus.subscribe(() => {
      throw new Error('sync');
    });
    bus.subscribe(() => Promise.reject(new Error('async')));
    bus.subscribe((event) => {
      seen.push(event.kind);
    });
    expect(() =>
      bus.publish('cache', 'valkey', ResilienceEventKind.Retry),
    ).not.toThrow();
    expect(seen).toEqual([ResilienceEventKind.Retry]);
  });
});
