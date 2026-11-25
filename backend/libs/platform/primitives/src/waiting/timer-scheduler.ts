/** Timers and abort signals shared by `Deadline` and the waits with a deadline. */
export class TimerScheduler {
  /** Largest wait that `setTimeout` accepts; a larger value fires almost immediately. */
  static readonly MAX_TIMER_MS = 2_147_483_647;

  /**
   * Arms a timer of `ms` milliseconds even if it exceeds the `setTimeout`
   * maximum, in segments. Returns the function that cancels it. Keeps the
   * process alive while it waits.
   */
  static arm(ms: number, fire: () => void): () => void {
    return TimerScheduler.schedule(ms, fire, false);
  }

  /**
   * Same as `arm`, but the timer does not keep the process alive: it suits
   * deadline signals that nothing else waits for.
   */
  static armDetached(ms: number, fire: () => void): () => void {
    return TimerScheduler.schedule(ms, fire, true);
  }

  /** Abort reason as an `Error`, so it always rejects with an error. */
  static abortReason(signal: AbortSignal): Error {
    return signal.reason instanceof Error
      ? signal.reason
      : new Error('Operation aborted', { cause: signal.reason });
  }

  private static schedule(
    ms: number,
    fire: () => void,
    detached: boolean,
  ): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = (left: number): void => {
      const chunk = Math.min(left, TimerScheduler.MAX_TIMER_MS);
      timer = setTimeout(() => {
        if (left > chunk) {
          arm(left - chunk);
        } else {
          fire();
        }
      }, chunk);
      if (detached) {
        timer.unref();
      }
    };
    arm(Math.max(0, ms));
    return () => clearTimeout(timer);
  }
}
