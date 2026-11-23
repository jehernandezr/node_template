import type { UsageCount, UsageWindow } from './usage-count.js';
import { UsageCounterStore } from './usage-counter-store.js';

/** Contadores en el proceso, para un servicio sin Valkey: un reinicio pierde lo que no se envió. */
export class InMemoryUsageCounterStore extends UsageCounterStore {
  private readonly windows = new Map<number, Map<string, UsageCount>>();

  async add(
    windowStart: Date,
    tenantId: string,
    metric: string,
    quantity: number,
  ): Promise<void> {
    const window = this.windows.get(windowStart.getTime()) ?? new Map();
    const key = `${tenantId}|${metric}`;
    window.set(key, {
      tenantId,
      metric,
      quantity: (window.get(key)?.quantity ?? 0) + quantity,
    });
    this.windows.set(windowStart.getTime(), window);
  }

  async pending(before: Date): Promise<readonly UsageWindow[]> {
    return [...this.windows.entries()]
      .filter(([start]) => start < before.getTime())
      .sort(([a], [b]) => a - b)
      .map(([start, counts]) => ({
        start: new Date(start),
        counts: [...counts.values()],
      }));
  }

  async clear(windowStart: Date): Promise<void> {
    this.windows.delete(windowStart.getTime());
  }
}
