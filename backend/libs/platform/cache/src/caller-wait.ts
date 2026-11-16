import type { Clock } from '@platform/kernel';
import {
  Deadline,
  DeadlineExceededError,
  TimerScheduler,
} from '@platform/primitives';
import type { CallerWaitOptions } from './caller-wait.options.js';

/**
 * Espera de un llamador sobre un trabajo que puede ser compartido. El trabajo
 * nunca se cancela: si el llamador se rinde, otros llamadores que esperan el
 * mismo resultado lo siguen recibiendo.
 */
export class CallerWait {
  /**
   * Plazo que equivale a no tener límite. `Deadline` exige un presupuesto
   * finito, y una espera por una carga de caché nunca dura un año.
   */
  static readonly UNBOUNDED_MS = 365 * 24 * 60 * 60 * 1000;

  constructor(private readonly clock: Clock) {}

  /** Por qué el llamador ya no puede esperar, o `undefined` mientras puede. */
  cancellation(options: CallerWaitOptions): Error | undefined {
    if (options.signal?.aborted === true) {
      return TimerScheduler.abortReason(options.signal);
    }
    if (options.deadline?.isExpired() === true) {
      return new DeadlineExceededError(options.deadline.atMs);
    }
    return undefined;
  }

  /**
   * Espera `work` hasta que se resuelva, aborte la señal o venza el plazo, lo
   * que pase primero. Sin señal ni plazo devuelve la misma promesa.
   */
  wait<T>(work: Promise<T>, options: CallerWaitOptions): Promise<T> {
    if (options.signal === undefined && options.deadline === undefined) {
      return work;
    }
    const cancelled = this.cancellation(options);
    if (cancelled !== undefined) {
      // `work` puede rechazar después y nadie más lo escucha.
      work.catch(() => undefined);
      return Promise.reject(cancelled);
    }
    const deadline =
      options.deadline ?? Deadline.after(CallerWait.UNBOUNDED_MS, this.clock);
    return deadline.wait(work, options.signal);
  }
}
