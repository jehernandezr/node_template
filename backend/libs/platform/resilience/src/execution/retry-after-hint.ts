import type { Clock } from '@platform/kernel';
import { FailureClassifier, RetryAfterParser } from '@platform/primitives';
import { RetryAfterHeader } from './retry-after-header.enum.js';

/**
 * Reads the wait that the server suggests in an error: a numeric `retryAfterMs`
 * or the `Retry-After` header, in the error, in its `response` or in
 * its `cause` chain.
 */
export class RetryAfterHint {
  constructor(private readonly clock: Clock) {}

  /**
   * Reads the wait an error asks for, such as a `Retry-After`.
   * @returns the wait in milliseconds, bounded to `[0, maxMs]`, or `undefined`
   *   if the error does not carry a valid hint.
   * @param error Error of the call.
   * @param maxMs Largest wait accepted.
   */
  hintMs(
    error: unknown,
    maxMs: number = RetryAfterParser.DEFAULT_MAX_MS,
  ): number | undefined {
    let node: unknown = error;
    for (
      let depth = 0;
      depth <= FailureClassifier.MAX_CAUSE_DEPTH;
      depth += 1
    ) {
      if (typeof node !== 'object' || node === null) {
        return undefined;
      }
      const hint = this.readHint(node, maxMs);
      if (hint !== undefined) {
        return hint;
      }
      node = (node as { cause?: unknown }).cause;
    }
    return undefined;
  }

  private readHint(node: object, maxMs: number): number | undefined {
    const candidate = node as {
      retryAfterMs?: unknown;
      headers?: unknown;
      response?: { headers?: unknown };
    };
    if (
      typeof candidate.retryAfterMs === 'number' &&
      Number.isFinite(candidate.retryAfterMs) &&
      candidate.retryAfterMs >= 0
    ) {
      return Math.min(maxMs, Math.ceil(candidate.retryAfterMs));
    }
    const raw =
      RetryAfterHint.readHeader(candidate.headers) ??
      RetryAfterHint.readHeader(candidate.response?.headers);
    return raw === undefined
      ? undefined
      : new RetryAfterParser(this.clock, maxMs).parse(raw);
  }

  private static readHeader(headers: unknown): string | undefined {
    if (typeof headers !== 'object' || headers === null) {
      return undefined;
    }
    const getter = (headers as { get?: unknown }).get;
    if (typeof getter === 'function') {
      const value: unknown = (getter as (key: string) => unknown).call(
        headers,
        RetryAfterHeader.RetryAfter,
      );
      return typeof value === 'string' ? value : undefined;
    }
    const value = (headers as Record<string, unknown>)[
      RetryAfterHeader.RetryAfter
    ];
    return typeof value === 'string' || typeof value === 'number'
      ? String(value)
      : undefined;
  }
}
