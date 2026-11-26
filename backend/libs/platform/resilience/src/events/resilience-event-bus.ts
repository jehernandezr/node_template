import type { Clock } from '@platform/kernel';
import type { ResilienceEventKind } from './resilience-event-kind.enum.js';
import type {
  ResilienceEvent,
  ResilienceEventDetail,
  ResilienceEventListener,
} from './resilience-event.js';

/**
 * Dispatches the policies' events to their subscribers. A subscriber that
 * fails does not break the protected call: its synchronous and asynchronous errors are
 * discarded, because the metric must not change the business result.
 */
export class ResilienceEventBus {
  private readonly listeners = new Set<ResilienceEventListener>();

  constructor(private readonly clock: Clock) {}

  /**
   * Adds a subscriber of the policy events.
   * @returns function that removes the subscriber.
   * @param listener Subscriber.
   */
  subscribe(listener: ResilienceEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Sends an event to every subscriber.
   * A failing subscriber must not break the protected call.
   * @param policy Policy name.
   * @param dependencyKey Dependency the event is about.
   * @param kind Kind of event.
   * @param detail Error and timing of the event.
   */
  publish(
    policy: string,
    dependencyKey: string,
    kind: ResilienceEventKind,
    detail?: ResilienceEventDetail,
  ): void {
    const event: ResilienceEvent = {
      policy,
      dependencyKey,
      kind,
      at: this.clock.now().getTime(),
      detail,
    };
    for (const listener of this.listeners) {
      try {
        void Promise.resolve(listener(event)).catch(() => undefined);
      } catch {}
    }
  }
}
