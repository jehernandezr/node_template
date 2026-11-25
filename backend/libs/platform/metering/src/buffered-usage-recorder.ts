import type { UsageMetric } from '@contracts/billing';
import type { UsageCounterStore } from './usage-counter-store.js';
import { UsageRecorder } from './usage-recorder.js';
import type { UsageWindowClock } from './usage-window-clock.js';

/**
 * Adds usage to the counter of the current window. `UsageFlushJob` sends the closed windows to billing, so
 * a request never waits for billing or writes to the database.
 */
export class BufferedUsageRecorder extends UsageRecorder {
  constructor(
    private readonly counters: UsageCounterStore,
    private readonly windows: UsageWindowClock,
  ) {
    super();
  }

  record(tenantId: string, metric: UsageMetric, quantity = 1): Promise<void> {
    return this.counters.add(
      this.windows.current(),
      tenantId,
      metric,
      quantity,
    );
  }
}
