/** Temporizadores y señales de aborto que comparten `Deadline` y las esperas con plazo. */
export class TimerScheduler {
  /** Mayor espera que acepta `setTimeout`; un valor mayor dispara casi de inmediato. */
  static readonly MAX_TIMER_MS = 2_147_483_647;

  /**
   * Arma un temporizador de `ms` milisegundos aunque supere el máximo de
   * `setTimeout`, por tramos. Devuelve la función que lo cancela. Mantiene vivo
   * el proceso mientras espera.
   */
  static arm(ms: number, fire: () => void): () => void {
    return TimerScheduler.schedule(ms, fire, false);
  }

  /**
   * Igual que `arm`, pero el temporizador no mantiene vivo el proceso: sirve
   * para señales de plazo que nadie más espera.
   */
  static armDetached(ms: number, fire: () => void): () => void {
    return TimerScheduler.schedule(ms, fire, true);
  }

  /** Motivo de aborto como `Error`, para rechazar siempre con un error. */
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
