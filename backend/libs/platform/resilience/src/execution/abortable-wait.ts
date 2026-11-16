import { TimerScheduler } from '@platform/primitives';

/** Esperas que se cortan cuando una señal de aborto se dispara. */
export class AbortableWait {
  /**
   * Corre `work` hasta que termine o hasta que `signal` aborte, lo que pase
   * primero. Si aborta, rechaza con el motivo aunque `work` siga corriendo; su
   * rechazo tardío se descarta. Si la señal ya está abortada, no corre `work`.
   */
  static until<T>(work: () => Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) {
      return Promise.reject(TimerScheduler.abortReason(signal));
    }
    return new Promise<T>((resolve, reject) => {
      const onAbort = (): void => {
        reject(TimerScheduler.abortReason(signal));
      };
      signal.addEventListener('abort', onAbort, { once: true });
      work()
        .then(resolve, reject)
        .finally(() => {
          signal.removeEventListener('abort', onAbort);
        })
        .catch(() => undefined);
    });
  }

  /**
   * Espera `ms` milisegundos. Si la señal aborta antes, cancela el temporizador
   * y rechaza con el motivo de la señal.
   */
  static sleep(ms: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      return Promise.reject(TimerScheduler.abortReason(signal));
    }
    return new Promise<void>((resolve, reject) => {
      const onAbort = (): void => {
        cancelTimer();
        reject(TimerScheduler.abortReason(signal));
      };
      const cancelTimer = TimerScheduler.arm(ms, () => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      });
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }
}
