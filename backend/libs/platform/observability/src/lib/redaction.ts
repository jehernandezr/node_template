/** Texto que reemplaza un valor sensible. */
export const REDACTED = '[REDACTED]';

/** Profundidad máxima que se recorre de un objeto antes de cortarlo. */
export const MAX_REDACTION_DEPTH = 10;

/** Niveles de `cause` que se serializan; coincide con los que recorre `classifyFailure`. */
export const MAX_ERROR_CAUSE_DEPTH = 3;

/** Errores agregados (`AggregateError.errors`) que se serializan como máximo. */
const MAX_AGGREGATED_ERRORS = 10;

const TRUNCATED = '[Truncated]';
const CIRCULAR = '[Circular]';

const SENSITIVE_LAST_WORDS = new Set([
  'token',
  'password',
  'passwd',
  'passcode',
  'passcodes',
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
  'pin',
  'pins',
  'cvv',
  'cvc',
  'pan',
]);
const SENSITIVE_FIRST_WORDS = new Set([
  'password',
  'passwd',
  'passcode',
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
  'pin',
  'cvv',
  'cvc',
]);
/** Nombres compuestos que solo tienen sentido juntos (`privateKey`, `signing_key`). */
const SENSITIVE_COMPOUNDS = [
  'apikey',
  'privatekey',
  'secretkey',
  'signingkey',
  'accesskey',
  'encryptionkey',
];
/**
 * `code` solo es sensible cuando lo califica una de estas palabras: los códigos
 * de un solo uso de MFA, verificación, recuperación o reset (`mfaCode`,
 * `verificationCode`, `oneTimeCode`, `recovery_codes`). `errorCode`,
 * `statusCode` o `countryCode` se mantienen visibles.
 */
const CODE_WORDS = new Set(['code', 'codes']);
const SECRET_CODE_QUALIFIERS = new Set([
  'mfa',
  'verification',
  'verify',
  'recovery',
  'reset',
  'otp',
  'one',
  'totp',
  'hotp',
  'factor',
  'auth',
  'authorization',
  'confirmation',
  'confirm',
  'security',
  'backup',
  'sms',
  'email',
  'device',
  'login',
  'access',
  'activation',
  'invite',
  'invitation',
  'pairing',
  'unlock',
]);

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
    // se usa el nombre crudo
  }
  return decoded.toLowerCase() === 'code' || isSensitiveKey(decoded);
}

/**
 * Oculta secretos dentro de texto libre: credenciales en URLs
 * (`https://user:pass@host`), parámetros sensibles (`token=`, `code=`,
 * `mfa_code=`...), valores `Bearer`/`Basic`, cadenas con forma de JWT y
 * llaves privadas PEM.
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
 * Parte la llave en palabras en minúscula (camelCase, snake_case, kebab-case)
 * y decide por la posición de cada palabra. Así `accessToken`, `passwordHash`
 * o `mfaCode` son sensibles, mientras `tokenCount`, `inputTokens` o
 * `errorCode` se mantienen.
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
  if (SENSITIVE_LAST_WORDS.has(last) || SENSITIVE_FIRST_WORDS.has(first)) {
    return true;
  }
  if (
    CODE_WORDS.has(last) &&
    words.slice(0, -1).some((word) => SECRET_CODE_QUALIFIERS.has(word))
  ) {
    return true;
  }
  const joined = words.join('');
  return SENSITIVE_COMPOUNDS.some((compound) => joined.includes(compound));
}

/**
 * Devuelve una copia redactada de `value` lista para `JSON.stringify`:
 *
 * - Las llaves sensibles valen `[REDACTED]` a cualquier profundidad y el texto
 *   libre pasa por {@link redactString}.
 * - Un `Error` conserva `name`, `message`, `stack`, sus propiedades propias
 *   (`code`, `details`, `retryable`...) redactadas, `cause` hasta
 *   {@link MAX_ERROR_CAUSE_DEPTH} niveles y los `errors` de un `AggregateError`.
 * - `Buffer` y arreglos tipados se resumen como `[Binary n bytes]`; `Map` y
 *   `Set` se convierten en arreglos.
 * - Un objeto con `toJSON` (por ejemplo `Secret`) se serializa con él.
 *
 * Nunca muta la entrada.
 */
export function redact(value: unknown): unknown {
  return sanitize(value, new Set<object>(), 0, 0);
}

function binarySummary(byteLength: number): string {
  return `[Binary ${byteLength} bytes]`;
}

function sanitize(
  value: unknown,
  ancestors: Set<object>,
  depth: number,
  causeDepth: number,
): unknown {
  if (typeof value === 'string') {
    return redactString(value);
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
    return binarySummary(value.byteLength);
  }
  if (value instanceof ArrayBuffer) {
    return binarySummary(value.byteLength);
  }
  if (depth >= MAX_REDACTION_DEPTH) {
    return TRUNCATED;
  }
  if (ancestors.has(value)) {
    return CIRCULAR;
  }
  ancestors.add(value);
  try {
    const next = (item: unknown): unknown =>
      sanitize(item, ancestors, depth + 1, causeDepth);
    if (value instanceof Error) {
      return serializeError(value, ancestors, depth, causeDepth);
    }
    if (Array.isArray(value)) {
      return value.map(next);
    }
    if (value instanceof Map) {
      return [...value.entries()].map(([key, item]) => [
        next(key),
        typeof key === 'string' && isSensitiveKey(key) ? REDACTED : next(item),
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
      out[key] = isSensitiveKey(key) ? REDACTED : next(item);
    }
    return out;
  } finally {
    ancestors.delete(value);
  }
}

const ERROR_BASE_KEYS = new Set(['name', 'message', 'stack', 'cause']);

function serializeError(
  error: Error,
  ancestors: Set<object>,
  depth: number,
  causeDepth: number,
): Record<string, unknown> {
  const next = (item: unknown): unknown =>
    sanitize(item, ancestors, depth + 1, causeDepth);
  const out: Record<string, unknown> = {
    name: error.name,
    message: redactString(String(error.message)),
    stack: error.stack === undefined ? undefined : redactString(error.stack),
  };
  // Propiedades propias: `code`, `details`, `retryable`, `failureKind`, `errno`...
  for (const [key, item] of Object.entries(error)) {
    if (ERROR_BASE_KEYS.has(key)) {
      continue;
    }
    out[key] = isSensitiveKey(key) ? REDACTED : next(item);
  }
  if (error instanceof AggregateError && Array.isArray(error.errors)) {
    out['errors'] = error.errors.slice(0, MAX_AGGREGATED_ERRORS).map(next);
  }
  const cause: unknown = error.cause;
  if (cause !== undefined) {
    out['cause'] =
      causeDepth >= MAX_ERROR_CAUSE_DEPTH
        ? TRUNCATED
        : sanitize(cause, ancestors, depth + 1, causeDepth + 1);
  }
  return out;
}
