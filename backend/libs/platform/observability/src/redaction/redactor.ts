import { RedactionRules } from './redaction-rules.js';

/**
 * Oculta valores sensibles en objetos, errores y texto antes de registrarlos.
 * Las listas de palabras entran por constructor.
 */
export class Redactor {
  /** Texto que reemplaza un valor sensible. */
  static readonly REDACTED = '[REDACTED]';
  /** Profundidad máxima que se recorre de un objeto antes de cortarlo. */
  static readonly MAX_DEPTH = 10;
  /** Niveles de `cause` que se serializan; coincide con los que recorre la clasificación de fallos. */
  static readonly MAX_ERROR_CAUSE_DEPTH = 3;

  /** Errores agregados (`AggregateError.errors`) que se serializan como máximo. */
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

  /** Copia de `value` con los valores sensibles reemplazados por `Redactor.REDACTED`. Nunca muta la entrada. */
  redact(value: unknown): unknown {
    return this.sanitize(value, new Set<object>(), 0, 0);
  }

  /** Oculta credenciales incrustadas en texto libre (URLs con usuario, query, bearer, JWT, llaves privadas). */
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
   * Parte la llave en palabras en minúscula (camelCase, snake_case, kebab-case)
   * y decide por la posición de cada palabra. Así `accessToken`, `passwordHash`
   * o `mfaCode` son sensibles, mientras `tokenCount`, `inputTokens`,
   * `sessionId` o `errorCode` se mantienen.
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

  private isSensitiveParam(name: string): boolean {
    let decoded = name;
    try {
      decoded = decodeURIComponent(name);
    } catch {
      // Una codificación inválida se compara con el nombre crudo.
    }
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
    // Propiedades propias: `code`, `details`, `retryable`, `failureKind`, `errno`...
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
