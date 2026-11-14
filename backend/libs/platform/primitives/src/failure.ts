import { Clock, FailureKind } from '@platform/kernel';
import { FailureClassifier } from './failure/failure-classifier.js';
import { RetryAfterParser } from './failure/retry-after-parser.js';

export { FailureKind };

/** @deprecated Usa `FailureClassifier.MAX_CAUSE_DEPTH`. */
export const MAX_CAUSE_DEPTH = FailureClassifier.MAX_CAUSE_DEPTH;

/** @deprecated Usa `RetryAfterParser.DEFAULT_MAX_MS`. */
export const DEFAULT_RETRY_AFTER_MAX_MS = RetryAfterParser.DEFAULT_MAX_MS;

/** Reloj que devuelve siempre el instante recibido. */
class InstantClock extends Clock {
  constructor(private readonly nowMs: number) {
    super();
  }

  now(): Date {
    return new Date(this.nowMs);
  }
}

/** Funciones de compatibilidad sobre `FailureClassifier` y `RetryAfterParser`. */
class FailureShim {
  private static readonly classifier = new FailureClassifier();

  static classify(error: unknown): FailureKind {
    return FailureShim.classifier.classify(error);
  }

  static isTransient(error: unknown): boolean {
    return FailureShim.classifier.isTransient(error);
  }

  static retryAfter(
    value: string | number | Date | null | undefined,
    maxMs: number = RetryAfterParser.DEFAULT_MAX_MS,
    nowMs: number = Date.now(),
  ): number | undefined {
    return new RetryAfterParser(new InstantClock(nowMs), maxMs).parse(value);
  }
}

/** @deprecated Usa `FailureClassifier.classify`. */
export const classifyFailure = FailureShim.classify;

/** @deprecated Usa `FailureClassifier.isTransient`. */
export const isTransientError = FailureShim.isTransient;

/** @deprecated Usa `RetryAfterParser.parse`. */
export const retryAfterMs = FailureShim.retryAfter;
