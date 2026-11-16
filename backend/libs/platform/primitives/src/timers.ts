import type { Deadline } from './deadline.js';
import { DeadlineExceededError } from './errors/deadline-exceeded.error.js';
import { PrimitivesGuard } from './errors/primitives-guard.js';
import { TimerScheduler } from './waiting/timer-scheduler.js';

/** @deprecated Usa `TimerScheduler.MAX_TIMER_MS`. */
export const MAX_TIMER_MS = TimerScheduler.MAX_TIMER_MS;

/** @deprecated Usa `Deadline.sleep` o `TimerScheduler`. */
export interface SleepOptions {
  /** Corta la espera y rechaza con el motivo de la señal. */
  readonly signal?: AbortSignal;
  /** `true` para que el temporizador no mantenga vivo el proceso. */
  readonly unref?: boolean;
}

/** @deprecated Usa `TimerScheduler.abortReason`. */
export function abortReason(signal: AbortSignal): Error {
  return TimerScheduler.abortReason(signal);
}

/** @deprecated Usa `TimerScheduler.arm` o `TimerScheduler.armDetached`. */
export function armTimer(
  ms: number,
  fire: () => void,
  unref = false,
): () => void {
  return unref
    ? TimerScheduler.armDetached(ms, fire)
    : TimerScheduler.arm(ms, fire);
}

/** @deprecated Usa `Deadline.sleep`. */
export function abortableSleep(
  ms: number,
  options: SleepOptions = {},
): Promise<void> {
  PrimitivesGuard.instance.nonNegativeFinite('ms', ms);
  const { signal } = options;
  if (signal?.aborted === true) {
    return Promise.reject(TimerScheduler.abortReason(signal));
  }
  return new Promise<void>((resolve, reject) => {
    const onAbort = (): void => {
      cancel();
      reject(TimerScheduler.abortReason(signal as AbortSignal));
    };
    const cancel = armTimer(
      ms,
      () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      },
      options.unref ?? false,
    );
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** @deprecated Usa `Deadline.race`. */
export enum RaceStop {
  /** Se agotó el plazo o `timeoutMs`. */
  Timeout = 'timeout',
  /** Quien llama abortó con su `signal`. */
  Aborted = 'aborted',
}

/** @deprecated Usa `Deadline.race`. */
export type RaceResult<T> =
  | { readonly settled: true; readonly value: T }
  | { readonly settled: false; readonly stop: RaceStop };

/** @deprecated Usa `Deadline.race`. */
export interface RaceOptions {
  readonly deadline?: Deadline;
  readonly timeoutMs?: number;
  readonly signal?: AbortSignal;
}

/** Convierte un lanzamiento síncrono de `work` en una promesa rechazada. */
function startWork<T>(
  work: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  try {
    return work(signal);
  } catch (error) {
    return Promise.reject(error);
  }
}

/**
 * Corre `work` con una señal que aborta cuando vence el plazo (el menor entre
 * `deadline` y `timeoutMs`) o cuando aborta `signal`, y deja de esperarlo en
 * ese momento. Si `work` lanza antes, el error se propaga.
 * @deprecated Usa `Deadline.race`.
 */
export async function raceDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  options: RaceOptions = {},
): Promise<RaceResult<T>> {
  const { deadline, timeoutMs, signal } = options;
  if (timeoutMs !== undefined) {
    PrimitivesGuard.instance.nonNegativeFinite('timeoutMs', timeoutMs);
  }
  if (signal?.aborted === true) {
    return { settled: false, stop: RaceStop.Aborted };
  }
  const budgets = [deadline?.remainingMs(), timeoutMs].filter(
    (value): value is number => value !== undefined,
  );
  const budget = budgets.length === 0 ? undefined : Math.min(...budgets);
  const controller = new AbortController();
  const workSignal =
    signal === undefined
      ? controller.signal
      : AbortSignal.any([controller.signal, signal]);
  const running = startWork(work, workSignal);
  const atMs =
    deadline !== undefined && budget === deadline.remainingMs()
      ? deadline.atMs
      : Date.now() + (budget ?? 0);

  let cancelTimer = (): void => undefined;
  let onAbort: (() => void) | undefined;
  const stopped = new Promise<RaceResult<T>>((resolve) => {
    if (budget !== undefined) {
      cancelTimer = TimerScheduler.arm(budget, () => {
        controller.abort(new DeadlineExceededError(atMs));
        resolve({ settled: false, stop: RaceStop.Timeout });
      });
    }
    if (signal !== undefined) {
      onAbort = () => resolve({ settled: false, stop: RaceStop.Aborted });
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
  try {
    return await Promise.race([
      running.then((value): RaceResult<T> => ({ settled: true, value })),
      stopped,
    ]);
  } finally {
    cancelTimer();
    if (onAbort !== undefined) {
      signal?.removeEventListener('abort', onAbort);
    }
    // Un trabajo abandonado puede rechazar después: su error no tiene dueño.
    running.catch(() => undefined);
  }
}
