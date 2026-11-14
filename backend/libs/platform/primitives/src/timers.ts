import type { Deadline } from './deadline.js';
import { DeadlineExceededError, InvalidArgumentError } from './errors.js';

/** Mayor espera que acepta `setTimeout`; un valor mayor dispara casi de inmediato. */
export const MAX_TIMER_MS = 2_147_483_647;

/** Opciones de {@link abortableSleep}. */
export interface SleepOptions {
  /** Corta la espera y rechaza con el motivo de la señal. */
  readonly signal?: AbortSignal;
  /**
   * `true` para que el temporizador no mantenga vivo el proceso. Por defecto
   * `false`: un script que solo espera terminaría antes de tiempo.
   */
  readonly unref?: boolean;
}

/** Motivo de aborto como `Error`, para rechazar siempre con un error. */
export function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new Error('Operation aborted', { cause: signal.reason });
}

/**
 * Arma un temporizador de `ms` milisegundos aunque supere el máximo de
 * `setTimeout`, por tramos. Devuelve la función que lo cancela.
 */
export function armTimer(
  ms: number,
  fire: () => void,
  unref = false,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = (left: number): void => {
    const chunk = Math.min(left, MAX_TIMER_MS);
    timer = setTimeout(() => {
      if (left > chunk) {
        arm(left - chunk);
      } else {
        fire();
      }
    }, chunk);
    if (unref) {
      timer.unref();
    }
  };
  arm(Math.max(0, ms));
  return () => clearTimeout(timer);
}

/**
 * Espera `ms` milisegundos. Si `signal` aborta antes, rechaza con su motivo y
 * libera el temporizador.
 */
export function abortableSleep(
  ms: number,
  options: SleepOptions = {},
): Promise<void> {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new InvalidArgumentError('ms', 'a finite number >= 0');
  }
  const { signal } = options;
  if (signal?.aborted === true) {
    return Promise.reject(abortReason(signal));
  }
  return new Promise<void>((resolve, reject) => {
    const onAbort = (): void => {
      cancel();
      reject(abortReason(signal as AbortSignal));
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

/** Por qué {@link raceDeadline} dejó de esperar el trabajo. */
export enum RaceStop {
  /** Se agotó el plazo o `timeoutMs`. */
  Timeout = 'timeout',
  /** Quien llama abortó con su `signal`. */
  Aborted = 'aborted',
}

/** Resultado de {@link raceDeadline}. */
export type RaceResult<T> =
  | { readonly settled: true; readonly value: T }
  | { readonly settled: false; readonly stop: RaceStop };

/** Opciones de {@link raceDeadline}. Sin plazo ni `timeoutMs`, solo corta la señal. */
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
 * `deadline` y `timeoutMs`) o cuando aborta `signal`, y deja de esperarlo en ese
 * momento: el trabajo pudo o no aplicar sus efectos, así que quien llama lo
 * trata como incierto. Al vencer el plazo, la señal aborta con
 * `DeadlineExceededError`. Si `work` lanza antes, el error se propaga.
 */
export async function raceDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  options: RaceOptions = {},
): Promise<RaceResult<T>> {
  const { deadline, timeoutMs, signal } = options;
  if (
    timeoutMs !== undefined &&
    (!Number.isFinite(timeoutMs) || timeoutMs < 0)
  ) {
    throw new InvalidArgumentError('timeoutMs', 'a finite number >= 0');
  }
  if (signal?.aborted === true) {
    return { settled: false, stop: RaceStop.Aborted };
  }
  const budgets = [deadline?.remaining(), timeoutMs].filter(
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
    deadline !== undefined && budget === deadline.remaining()
      ? deadline.atMs
      : Date.now() + (budget ?? 0);

  let cancelTimer = (): void => undefined;
  let onAbort: (() => void) | undefined;
  const stopped = new Promise<RaceResult<T>>((resolve) => {
    if (budget !== undefined) {
      cancelTimer = armTimer(budget, () => {
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
