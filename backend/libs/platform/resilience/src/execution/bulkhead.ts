import { TimerScheduler } from '@platform/primitives';
import type { BulkheadOptions } from './bulkhead.options.js';

/**
 * Limita las llamadas simultáneas a una dependencia. Las que pasan de `limit`
 * esperan en una cola FIFO de `queue` lugares; si la cola también está llena,
 * se rechazan de inmediato, así que una dependencia lenta no acumula trabajo
 * sin límite. Una llamada terminada entrega su cupo a la siguiente en espera.
 */
export class Bulkhead {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(private readonly options: BulkheadOptions) {}

  async execute<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (this.active < this.options.limit) {
      this.active += 1;
    } else if (this.waiting.length < this.options.queue) {
      await this.waitForSlot(signal);
    } else {
      this.options.onReject?.();
      throw this.options.rejectWith();
    }
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Espera un cupo. Si la llamada abandona la cola, el cupo se queda para los
   * demás.
   */
  private waitForSlot(signal: AbortSignal | undefined): Promise<void> {
    if (signal?.aborted === true) {
      return Promise.reject(TimerScheduler.abortReason(signal));
    }
    return new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        const index = this.waiting.indexOf(grant);
        if (index >= 0) {
          this.waiting.splice(index, 1);
        }
        reject(TimerScheduler.abortReason(signal as AbortSignal));
      };
      const grant = (): void => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      };
      this.waiting.push(grant);
      signal?.addEventListener('abort', onAbort, { once: true });
    });
  }

  private release(): void {
    const next = this.waiting.shift();
    if (next === undefined) {
      this.active -= 1;
    } else {
      next();
    }
  }
}
