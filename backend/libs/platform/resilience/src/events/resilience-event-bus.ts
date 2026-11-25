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

  /** @returns function that removes the subscriber. */
  subscribe(listener: ResilienceEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

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
      } catch {
        // A failing subscriber must not break the protected call.
      }
    }
  }
}
