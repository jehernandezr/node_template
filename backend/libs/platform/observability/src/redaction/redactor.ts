import { RedactionRules } from './redaction-rules.js';

/**
 * Hides sensitive values in objects, errors and text before logging them.
 * The word lists come in through the constructor.
 */
export class Redactor {
  /** Text that replaces a sensitive value. */
  static readonly REDACTED = '[REDACTED]';
  /** Maximum depth traversed in an object before cutting it off. */
  static readonly MAX_DEPTH = 10;
  /** Levels of `cause` that are serialized; matches the levels walked by failure classification. */
  static readonly MAX_ERROR_CAUSE_DEPTH = 3;

  /** Maximum number of aggregated errors (`AggregateError.errors`) that are serialized. */
  private static readonly MAX_AGGREGATED_ERRORS = 10;
  private static readonly TRUNCATED = '[Truncated]';
  private static readonly CIRCULAR = '[Circular]';
  private static readonly ERROR_BASE_KEYS = new Set([
    'name',
    'message',
    'stack',
    'cause',
  ]);

  private static readonly USERINFO_IN_URL =
    /([a-z][a-z0-9+.-]*:\/\/)[^\s/?#@]*@/gi;
  private static readonly QUERY_PARAM = /([?&;])([^=&#\s;]+)=([^&#\s;]*)/g;
  private static readonly BEARER_VALUE =
    /\b(bearer|basic)\s+[A-Za-z0-9._~+/=-]{4,}/gi;
  private static readonly JWT_VALUE =
    /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g;
  private static readonly PRIVATE_KEY_BLOCK =
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g;

  constructor(
    private readonly rules: RedactionRules = RedactionRules.defaults(),
  ) {}

  /** Returns a copy of `value` with sensitive values replaced by `Redactor.REDACTED`. Never mutates the input. */
  redact(value: unknown): unknown {
    return this.sanitize(value, new Set<object>(), 0, 0);
  }

  /** Hides credentials embedded in free text (URLs with user info, query, bearer, JWT, private keys). */
  redactString(text: string): string {
    return text
      .replace(Redactor.PRIVATE_KEY_BLOCK, Redactor.REDACTED)
      .replace(Redactor.USERINFO_IN_URL, `$1${Redactor.REDACTED}@`)
      .replace(Redactor.QUERY_PARAM, (match, sep: string, name: string) =>
        this.isSensitiveParam(name)
          ? `${sep}${name}=${Redactor.REDACTED}`
          : match,
      )
      .replace(
        Redactor.BEARER_VALUE,
        (_match, scheme: string) => `${scheme} ${Redactor.REDACTED}`,
      )
      .replace(Redactor.JWT_VALUE, Redactor.REDACTED);
  }

  /**
   * Splits the key into lowercase words (camelCase, snake_case, kebab-case)
   * and decides by the position of each word. So `accessToken`, `passwordHash`
   * or `mfaCode` are sensitive, while `tokenCount`, `inputTokens`,
   * `sessionId` or `errorCode` are kept.
   */
  isSensitiveKey(key: string): boolean {
    const lists = this.rules.lists;
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
    const qualifiers = words.slice(0, -1);
    if (lists.publicLastWords.has(last)) {
      return false;
    }
    if (
      lists.sensitiveLastWords.has(last) ||
      lists.sensitiveFirstWords.has(first)
    ) {
      return true;
    }
    if (
      lists.codeWords.has(last) &&
      qualifiers.some((word) => lists.secretCodeQualifiers.has(word))
    ) {
      return true;
    }
    if (
      lists.digestWords.has(last) &&
      qualifiers.some((word) => lists.digestedSecrets.has(word))
    ) {
      return true;
    }
    const joined = words.join('');
    return [...lists.sensitiveCompounds].some((compound) =>
      joined.includes(compound),
    );
  }

  /**
   * An invalid encoding is compared against the raw name.
   */
  private isSensitiveParam(name: string): boolean {
    let decoded = name;
    try {
      decoded = decodeURIComponent(name);
    } catch {}
    return decoded.toLowerCase() === 'code' || this.isSensitiveKey(decoded);
  }

  private binarySummary(byteLength: number): string {
    return `[Binary ${byteLength} bytes]`;
  }

  private sanitize(
    value: unknown,
    ancestors: Set<object>,
    depth: number,
    causeDepth: number,
  ): unknown {
    if (typeof value === 'string') {
      return this.redactString(value);
    }
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (value === null || typeof value !== 'object') {
      return value;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    if (ArrayBuffer.isView(value)) {
      return this.binarySummary(value.byteLength);
    }
    if (value instanceof ArrayBuffer) {
      return this.binarySummary(value.byteLength);
    }
    if (depth >= Redactor.MAX_DEPTH) {
      return Redactor.TRUNCATED;
    }
    if (ancestors.has(value)) {
      return Redactor.CIRCULAR;
    }
    ancestors.add(value);
    try {
      const next = (item: unknown): unknown =>
        this.sanitize(item, ancestors, depth + 1, causeDepth);
      if (value instanceof Error) {
        return this.serializeError(value, ancestors, depth, causeDepth);
      }
      if (Array.isArray(value)) {
        return value.map(next);
      }
      if (value instanceof Map) {
        return [...value.entries()].map(([key, item]) => [
          next(key),
          typeof key === 'string' && this.isSensitiveKey(key)
            ? Redactor.REDACTED
            : next(item),
        ]);
      }
      if (value instanceof Set) {
        return [...value.values()].map(next);
      }
      const toJSON = (value as { toJSON?: unknown }).toJSON;
      if (typeof toJSON === 'function') {
        return next(toJSON.call(value));
      }
      const out: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) {
        out[key] = this.isSensitiveKey(key) ? Redactor.REDACTED : next(item);
      }
      return out;
    } finally {
      ancestors.delete(value);
    }
  }

  /**
   * Propiedades propias: `code`, `details`, `retryable`, `failureKind`, `errno`...
   */
  private serializeError(
    error: Error,
    ancestors: Set<object>,
    depth: number,
    causeDepth: number,
  ): Record<string, unknown> {
    const next = (item: unknown): unknown =>
      this.sanitize(item, ancestors, depth + 1, causeDepth);
    const out: Record<string, unknown> = {
      name: error.name,
      message: this.redactString(String(error.message)),
      stack:
        error.stack === undefined ? undefined : this.redactString(error.stack),
    };
    for (const [key, item] of Object.entries(error)) {
      if (Redactor.ERROR_BASE_KEYS.has(key)) {
        continue;
      }
      out[key] = this.isSensitiveKey(key) ? Redactor.REDACTED : next(item);
    }
    if (error instanceof AggregateError && Array.isArray(error.errors)) {
      out['errors'] = error.errors
        .slice(0, Redactor.MAX_AGGREGATED_ERRORS)
        .map(next);
    }
    const cause: unknown = error.cause;
    if (cause !== undefined) {
      out['cause'] =
        causeDepth >= Redactor.MAX_ERROR_CAUSE_DEPTH
          ? Redactor.TRUNCATED
          : this.sanitize(cause, ancestors, depth + 1, causeDepth + 1);
    }
    return out;
  }
}
