import {
  DEFAULT_RETRY_AFTER_MAX_MS,
  MAX_CAUSE_DEPTH,
  retryAfterMs as parseRetryAfterMs,
} from '@platform/primitives';

/** Options of {@link retryAfterHintMs}. */
export interface RetryAfterHintOptions {
  /** Upper bound of the wait. Default: `DEFAULT_RETRY_AFTER_MAX_MS` from primitives. */
  readonly maxMs?: number;
  /** Current time in epoch milliseconds, for headers that carry a date. */
  readonly nowMs?: number;
}

function readHeader(headers: unknown, name: string): string | undefined {
  if (typeof headers !== 'object' || headers === null) {
    return undefined;
  }
  const getter = (headers as { get?: unknown }).get;
  if (typeof getter === 'function') {
    const value: unknown = (getter as (key: string) => unknown).call(
      headers,
      name,
    );
    return typeof value === 'string' ? value : undefined;
  }
  const value = (headers as Record<string, unknown>)[name];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : undefined;
}

function readHint(
  node: object,
  maxMs: number,
  nowMs: number,
): number | undefined {
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
    readHeader(candidate.headers, 'retry-after') ??
    readHeader(candidate.response?.headers, 'retry-after');
  return raw === undefined ? undefined : parseRetryAfterMs(raw, maxMs, nowMs);
}

/**
 * Wait suggested by the server before retrying, in milliseconds and bounded to
 * `[0, maxMs]`. Reads a numeric `retryAfterMs` property or a `Retry-After`
 * header (parsed with `retryAfterMs` from primitives) on the error, its
 * `response` or its `cause` chain.
 * @returns undefined when the error carries no valid hint.
 */
export function retryAfterHintMs(
  error: unknown,
  options: RetryAfterHintOptions = {},
): number | undefined {
  const maxMs = options.maxMs ?? DEFAULT_RETRY_AFTER_MAX_MS;
  const nowMs = options.nowMs ?? Date.now();
  let node: unknown = error;
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof node !== 'object' || node === null) {
      return undefined;
    }
    const hint = readHint(node, maxMs, nowMs);
    if (hint !== undefined) {
      return hint;
    }
    node = (node as { cause?: unknown }).cause;
  }
  return undefined;
}
