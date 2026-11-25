import type { UsageWindow } from './usage-count.js';

/** Usage counters per window, shared by all instances of the service. */
export abstract class UsageCounterStore {
  /** Adds `quantity` to the counter of the tenant and the metric in the window starting at `windowStart`. */
  abstract add(
    windowStart: Date,
    tenantId: string,
    metric: string,
    quantity: number,
  ): Promise<void>;

  /** The windows that started before `before` and were not flushed yet, from oldest to newest. */
  abstract pending(before: Date): Promise<readonly UsageWindow[]>;

  /** Forgets the window: it was already sent in full. */
  abstract clear(windowStart: Date): Promise<void>;
}
