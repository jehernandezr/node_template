import { FailureKind } from '@platform/kernel';
import type { FailureRule } from './failure-rule.js';

/** Properties of an error that the classifier knows how to read. */
interface ErrorLike {
  readonly name?: unknown;
  readonly code?: unknown;
  readonly status?: unknown;
  readonly statusCode?: unknown;
  readonly retryable?: unknown;
  readonly failureKind?: unknown;
  readonly cause?: unknown;
}

/**
 * Classifies any thrown value. Walks the error and its `cause` chain
 * (up to `MAX_CAUSE_DEPTH` levels) and uses the first explicit signal, from
 * the outside in:
 * 1. The injected rules (adapters translate their provider's errors
 *    here: Postgres, AWS, Valkey).
 * 2. A `failureKind` property with a `FailureKind` value.
 * 3. `name` `AbortError` (cancelled) or `TimeoutError` (timed out).
 * 4. `retryable: true`.
 * 5. A Node network code or one from its `fetch`.
 * 6. An HTTP status: 408, 425, 429, 502, 503 and 504 are transient; the rest of
 *    4xx and 5xx, permanent.
 *
 * Without a signal, a `TypeError`, `ReferenceError`, `SyntaxError`, `RangeError` or
 * `ZodError` is a protocol violation, and anything else is
 * permanent. The unknown is not retried.
 */
export class FailureClassifier {
  /** Levels of `cause` that are checked in addition to the top error. */
  static readonly MAX_CAUSE_DEPTH = 3;

  private static readonly TRANSIENT_NETWORK_CODES: ReadonlySet<string> =
    new Set([
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ECONNABORTED',
      'EAI_AGAIN',
      'ENOTFOUND',
      'ENETUNREACH',
      'EHOSTUNREACH',
      'EPIPE',
      'UND_ERR_CONNECT_TIMEOUT',
      'UND_ERR_SOCKET',
      'UND_ERR_HEADERS_TIMEOUT',
      'UND_ERR_BODY_TIMEOUT',
    ]);

  private static readonly TRANSIENT_STATUS: ReadonlySet<number> = new Set([
    408, 425, 429, 502, 503, 504,
  ]);

  /** JavaScript errors that reveal an implementation failure when nothing else explains them. */
  private static readonly IMPLEMENTATION_ERROR_NAMES: ReadonlySet<string> =
    new Set([
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'RangeError',
      'ZodError',
    ]);

  private static readonly FAILURE_KINDS: ReadonlySet<unknown> = new Set(
    Object.values(FailureKind),
  );

  /** `rules` are consulted at each node of the chain, before the built-in rules. */
  constructor(private readonly rules: readonly FailureRule[] = []) {}

  /**
   * Classifies an error with the registered rules, falling back to its declared kind.
   * @param error Error to classify.
   * @returns Its failure kind.
   */
  classify(error: unknown): FailureKind {
    let node: unknown = error;
    for (
      let depth = 0;
      depth <= FailureClassifier.MAX_CAUSE_DEPTH;
      depth += 1
    ) {
      if (typeof node !== 'object' || node === null) {
        break;
      }
      const kind = this.explicitKind(node);
      if (kind !== undefined) {
        return kind;
      }
      node = (node as ErrorLike).cause;
    }
    if (
      typeof error === 'object' &&
      error !== null &&
      FailureClassifier.IMPLEMENTATION_ERROR_NAMES.has(
        (error as ErrorLike).name as string,
      )
    ) {
      return FailureKind.ProtocolViolation;
    }
    return FailureKind.Permanent;
  }

  /**
   * Tells whether retrying an error can help.
   * Only `Transient` is retryable: a `Timeout` or `Cancelled` leaves the result uncertain.
   * @param error Error to check.
   * @returns `true` when transient.
   */
  isTransient(error: unknown): boolean {
    return this.classify(error) === FailureKind.Transient;
  }

  /** Classification that a node declares by itself, or `undefined` if it says nothing. */
  private explicitKind(node: object): FailureKind | undefined {
    for (const rule of this.rules) {
      const ruled = rule.classify(node);
      if (ruled !== undefined) {
        return ruled;
      }
    }
    const like = node as ErrorLike;
    if (FailureClassifier.FAILURE_KINDS.has(like.failureKind)) {
      return like.failureKind as FailureKind;
    }
    if (like.name === 'AbortError') {
      return FailureKind.Cancelled;
    }
    if (like.name === 'TimeoutError') {
      return FailureKind.Timeout;
    }
    if (like.retryable === true) {
      return FailureKind.Transient;
    }
    if (
      typeof like.code === 'string' &&
      FailureClassifier.TRANSIENT_NETWORK_CODES.has(like.code)
    ) {
      return FailureKind.Transient;
    }
    const status = FailureClassifier.httpStatus(like);
    if (status !== undefined && status >= 400 && status < 600) {
      return FailureClassifier.TRANSIENT_STATUS.has(status)
        ? FailureKind.Transient
        : FailureKind.Permanent;
    }
    return undefined;
  }

  private static httpStatus(node: ErrorLike): number | undefined {
    const status =
      typeof node.status === 'number' ? node.status : node.statusCode;
    return typeof status === 'number' && Number.isInteger(status)
      ? status
      : undefined;
  }
}
