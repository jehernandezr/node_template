import { TimerScheduler } from '@platform/primitives';

/** Waits that are cut short when an abort signal fires. */
export class AbortableWait {
  /**
   * Runs `work` until it finishes or until `signal` aborts, whichever happens
   * first. If it aborts, rejects with the reason even if `work` keeps running; its
   * late rejection is discarded. If the signal is already aborted, it does not run `work`.
   * @param work Work to wait for.
   * @param signal Abort signal.
   * @returns What `work` returns.
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
   * Waits `ms` milliseconds. If the signal aborts first, cancels the timer
   * and rejects with the signal's reason.
   * @param ms Milliseconds to wait.
   * @param signal Abort signal.
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
