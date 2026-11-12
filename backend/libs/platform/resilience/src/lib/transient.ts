const MAX_CAUSE_DEPTH = 3;

const TRANSIENT_CODES: ReadonlySet<string> = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'ENOTFOUND',
  'ENETUNREACH',
  'EPIPE',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'UND_ERR_HEADERS_TIMEOUT',
]);

/** Postgres SQLSTATE codes: serialization failure, deadlock, admin shutdown, too many connections. */
const TRANSIENT_SQLSTATES: ReadonlySet<string> = new Set([
  '40001',
  '40P01',
  '57P01',
  '53300',
]);

const TRANSIENT_STATUS: ReadonlySet<number> = new Set([
  408, 429, 502, 503, 504,
]);

/** Postgres class 08 (connection exception), any subcode. */
const CONNECTION_SQLSTATE = /^08[0-9A-Z]{3}$/;

/**
 * Walks an error and its `cause` chain (up to 3 levels) and returns the first
 * value `read` produces for a node, or undefined.
 */
function firstInCauseChain<T>(
  error: unknown,
  read: (node: object) => T | undefined,
): T | undefined {
  let node: unknown = error;
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof node !== 'object' || node === null) {
      return undefined;
    }
    const found = read(node);
    if (found !== undefined) {
      return found;
    }
    node = (node as { cause?: unknown }).cause;
  }
  return undefined;
}

function isTransientNode(node: object): true | undefined {
  const candidate = node as {
    retryable?: unknown;
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  if (candidate.retryable === true) {
    return true;
  }
  if (
    typeof candidate.code === 'string' &&
    (TRANSIENT_CODES.has(candidate.code) ||
      TRANSIENT_SQLSTATES.has(candidate.code) ||
      CONNECTION_SQLSTATE.test(candidate.code))
  ) {
    return true;
  }
  const status =
    typeof candidate.status === 'number'
      ? candidate.status
      : candidate.statusCode;
  return typeof status === 'number' && TRANSIENT_STATUS.has(status)
    ? true
    : undefined;
}

/**
 * Tells whether an error is worth retrying. Checks the error and its `cause`
 * chain (3 levels) for: `retryable === true`, a transient Node or Postgres code
 * (08xxx connection errors included), or HTTP 408, 429, 502, 503 or 504.
 * Validation-like errors are not transient.
 * @param error Any thrown value.
 */
export function isTransientError(error: unknown): boolean {
  return firstInCauseChain(error, isTransientNode) === true;
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

/** Parses a Retry-After value: delay in seconds, or an HTTP date. */
function parseRetryAfter(value: string): number | undefined {
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return Math.round(Number(trimmed) * 1000);
  }
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? undefined : Math.max(0, at - Date.now());
}

function readRetryAfter(node: object): number | undefined {
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
    return candidate.retryAfterMs;
  }
  const raw =
    readHeader(candidate.headers, 'retry-after') ??
    readHeader(candidate.response?.headers, 'retry-after');
  return raw === undefined ? undefined : parseRetryAfter(raw);
}

/**
 * Server-suggested wait before retrying, in milliseconds. Reads a numeric
 * `retryAfterMs` property or a `Retry-After` header (seconds or HTTP date),
 * on the error, its `response`, or its `cause` chain.
 * @param error Any thrown value.
 * @returns Milliseconds, or undefined when the error carries no hint.
 */
export function retryAfterMs(error: unknown): number | undefined {
  return firstInCauseChain(error, readRetryAfter);
}
