import { RequestContext } from './request-context.js';
import { toDisplayTraceId } from './trace.js';

export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export interface LoggerPort {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): LoggerPort;
}

export interface JsonLoggerOptions {
  service: string;
  level: LogLevel;
  /** Modules (logger `context` values) that emit debug lines regardless of level. */
  debugContexts?: string[];
  context?: string;
  /** Receives each JSON line without a trailing newline. Defaults to process.stdout. */
  sink?: (line: string) => void;
  clock?: () => Date;
}

const LEVEL_RANK: Record<LogLevel, number> = {
  [LogLevel.Debug]: 0,
  [LogLevel.Info]: 1,
  [LogLevel.Warn]: 2,
  [LogLevel.Error]: 3,
};

const REDACTED = '[REDACTED]';
const SENSITIVE_LAST_WORDS = new Set([
  'token',
  'password',
  'passwd',
  'secret',
  'authorization',
  'cookie',
  'cookies',
  'credential',
  'credentials',
  'signature',
  'jwt',
  'bearer',
  'otp',
  'session',
  'sessions',
  'passphrase',
]);
const SENSITIVE_FIRST_WORDS = new Set([
  'password',
  'passwd',
  'passphrase',
  'secret',
  'authorization',
  'cookie',
  'cookies',
  'session',
  'sessions',
  'jwt',
  'bearer',
  'otp',
]);
/** Compound names that only make sense joined (`privateKey`, `signing_key`). */
const SENSITIVE_COMPOUNDS = [
  'apikey',
  'privatekey',
  'secretkey',
  'signingkey',
  'accesskey',
  'encryptionkey',
];

const USERINFO_IN_URL = /([a-z][a-z0-9+.-]*:\/\/)[^\s/?#@]*@/gi;
const QUERY_PARAM = /([?&;])([^=&#\s;]+)=([^&#\s;]*)/g;
const BEARER_VALUE = /\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{4,}/gi;
const JWT_VALUE = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g;
const PRIVATE_KEY_BLOCK =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g;

function isSensitiveParam(name: string): boolean {
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {
    // keep the raw name
  }
  return decoded.toLowerCase() === 'code' || isSensitiveKey(decoded);
}

/**
 * Masks secrets that travel inside free text: credentials in URLs
 * (`https://user:pass@host`), sensitive query params (`token=`, `code=`, ...),
 * `Bearer`/`Basic` values, JWT-shaped strings and PEM private keys.
 */
export function redactString(text: string): string {
  return text
    .replace(PRIVATE_KEY_BLOCK, REDACTED)
    .replace(USERINFO_IN_URL, `$1${REDACTED}@`)
    .replace(QUERY_PARAM, (match, sep: string, name: string) =>
      isSensitiveParam(name) ? `${sep}${name}=${REDACTED}` : match,
    )
    .replace(BEARER_VALUE, (_m, scheme: string) => `${scheme} ${REDACTED}`)
    .replace(JWT_VALUE, REDACTED);
}

/**
 * Splits a key into lowercase words (camelCase, snake_case, kebab-case) and
 * decides by word position, so `accessToken` or `passwordHash` are sensitive
 * while metrics such as `tokenCount` or `inputTokens` are kept.
 */
export function isSensitiveKey(key: string): boolean {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) {
    return false;
  }
  const first = words[0] as string;
  const last = words[words.length - 1] as string;
  return (
    SENSITIVE_LAST_WORDS.has(last) ||
    SENSITIVE_FIRST_WORDS.has(first) ||
    SENSITIVE_COMPOUNDS.some((compound) => words.join('').includes(compound))
  );
}

/**
 * Returns a redacted deep copy of `value`. Sensitive keys become
 * '[REDACTED]' at any depth; Errors become { name, message, stack };
 * the input is never mutated.
 */
export function redact(value: unknown): unknown {
  return sanitize(value, new Set<object>());
}

function sanitize(value: unknown, ancestors: Set<object>): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack === undefined ? undefined : redactString(value.stack),
    };
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'string') {
    return redactString(value);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (ancestors.has(value)) {
    return '[Circular]';
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => sanitize(item, ancestors));
    }
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = isSensitiveKey(key) ? REDACTED : sanitize(item, ancestors);
    }
    return out;
  } finally {
    ancestors.delete(value);
  }
}

/** Writes one JSON object per line with trace context and automatic redaction. */
export class JsonLogger implements LoggerPort {
  private readonly bindings: Record<string, unknown>;

  constructor(
    private readonly options: JsonLoggerOptions,
    bindings: Record<string, unknown> = {},
  ) {
    this.bindings = { ...bindings };
  }

  debug(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Debug, message, fields);
  }

  info(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Info, message, fields);
  }

  warn(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Warn, message, fields);
  }

  error(message: string, fields?: Record<string, unknown>): void {
    this.write(LogLevel.Error, message, fields);
  }

  child(bindings: Record<string, unknown>): LoggerPort {
    return new JsonLogger(this.options, { ...this.bindings, ...bindings });
  }

  private write(
    level: LogLevel,
    message: string,
    fields: Record<string, unknown> = {},
  ): void {
    if (!this.shouldEmit(level)) {
      return;
    }
    const ctx = RequestContext.current();
    const sanitized = redact({ ...this.bindings, ...fields }) as Record<
      string,
      unknown
    >;

    const line = JSON.stringify({
      ...sanitized,
      timestamp: (this.options.clock ?? (() => new Date()))().toISOString(),
      level,
      service: this.options.service,
      context: this.options.context,
      message: redactString(message),
      traceId: ctx ? toDisplayTraceId(ctx.traceId) : undefined,
      spanId: ctx?.spanId,
      tenantId: ctx?.tenantId,
      userId: ctx?.userId,
    });

    (this.options.sink ?? defaultSink)(line);
  }

  private shouldEmit(level: LogLevel): boolean {
    if (LEVEL_RANK[level] >= LEVEL_RANK[this.options.level]) {
      return true;
    }
    if (level !== LogLevel.Debug) {
      return false;
    }
    const inDebugContext =
      this.options.context !== undefined &&
      (this.options.debugContexts ?? []).includes(this.options.context);
    return inDebugContext || RequestContext.current()?.debugSampled === true;
  }
}

function defaultSink(line: string): void {
  process.stdout.write(`${line}\n`);
}
