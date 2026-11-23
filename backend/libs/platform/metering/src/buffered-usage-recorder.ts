import type { UsageMetric } from '@contracts/billing';
import type { UsageCounterStore } from './usage-counter-store.js';
import { UsageRecorder } from './usage-recorder.js';
import type { UsageWindowClock } from './usage-window-clock.js';

/**
 * Suma el uso al contador de la ventana actual. `UsageFlushJob` envía las ventanas cerradas a billing, así
 * una petición nunca espera a billing ni escribe en la base.
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
