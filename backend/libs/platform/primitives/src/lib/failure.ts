import { InvalidArgumentError } from './errors.js';
import { FailureKind } from './failure-kind.js';

export { FailureKind } from './failure-kind.js';

/** Niveles de `cause` que se revisan además del error de arriba. */
export const MAX_CAUSE_DEPTH = 3;

/** Códigos de red de Node y undici que indican una falla pasajera. */
const TRANSIENT_CODES: ReadonlySet<string> = new Set([
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

/** SQLSTATE de Postgres: serialización, deadlock, apagado, demasiadas conexiones, sin memoria. */
const TRANSIENT_SQLSTATES: ReadonlySet<string> = new Set([
  '40001',
  '40P01',
  '57P01',
  '57P02',
  '57P03',
  '53300',
  '53200',
]);

/** Clase 08 de Postgres (excepción de conexión), cualquier subcódigo. */
const CONNECTION_SQLSTATE = /^08[0-9A-Z]{3}$/;

const TRANSIENT_STATUS: ReadonlySet<number> = new Set([
  408, 425, 429, 502, 503, 504,
]);

/** Errores de JavaScript que delatan un fallo de implementación cuando nada más los explica. */
const IMPLEMENTATION_ERROR_NAMES: ReadonlySet<string> = new Set([
  'TypeError',
  'ReferenceError',
  'SyntaxError',
  'RangeError',
  'ZodError',
]);

const FAILURE_KINDS: ReadonlySet<unknown> = new Set(Object.values(FailureKind));

interface ErrorLike {
  readonly name?: unknown;
  readonly code?: unknown;
  readonly status?: unknown;
  readonly statusCode?: unknown;
  readonly retryable?: unknown;
  readonly failureKind?: unknown;
  readonly cause?: unknown;
}

function httpStatus(node: ErrorLike): number | undefined {
  const status =
    typeof node.status === 'number' ? node.status : node.statusCode;
  return typeof status === 'number' && Number.isInteger(status)
    ? status
    : undefined;
}

/** Clasificación que un nodo declara por sí mismo, o undefined si no dice nada. */
function explicitKind(node: ErrorLike): FailureKind | undefined {
  if (FAILURE_KINDS.has(node.failureKind)) {
    return node.failureKind as FailureKind;
  }
  if (node.name === 'AbortError') {
    return FailureKind.Cancelled;
  }
  if (node.name === 'TimeoutError') {
    return FailureKind.Timeout;
  }
  if (typeof node.retryable === 'boolean') {
    return node.retryable ? FailureKind.Transient : FailureKind.Permanent;
  }
  if (
    typeof node.code === 'string' &&
    (TRANSIENT_CODES.has(node.code) ||
      TRANSIENT_SQLSTATES.has(node.code) ||
      CONNECTION_SQLSTATE.test(node.code))
  ) {
    return FailureKind.Transient;
  }
  const status = httpStatus(node);
  if (status !== undefined && status >= 400 && status < 600) {
    return TRANSIENT_STATUS.has(status)
      ? FailureKind.Transient
      : FailureKind.Permanent;
  }
  return undefined;
}

/**
 * Clasifica cualquier valor lanzado. Recorre el error y su cadena `cause`
 * (hasta `MAX_CAUSE_DEPTH` niveles) y usa la primera señal explícita, de
 * afuera hacia adentro:
 * 1. Una propiedad `failureKind` con un valor de `FailureKind`.
 * 2. `name` `AbortError` (cancelado) o `TimeoutError` (tiempo agotado).
 * 3. Un booleano `retryable`, como el de `PlatformError` (`DomainError` es permanente).
 * 4. Un código de red de Node o undici, o un SQLSTATE pasajero de Postgres.
 * 5. Un estado HTTP: 408, 425, 429, 502, 503 y 504 son pasajeros; el resto de 4xx y 5xx, permanentes.
 *
 * Sin señal, un `TypeError`, `ReferenceError`, `SyntaxError`, `RangeError` o
 * `ZodError` es una violación de protocolo, y cualquier otra cosa es permanente.
 * Lo desconocido no se reintenta.
 */
export function classifyFailure(error: unknown): FailureKind {
  let node: unknown = error;
  for (let depth = 0; depth <= MAX_CAUSE_DEPTH; depth += 1) {
    if (typeof node !== 'object' || node === null) {
      break;
    }
    const kind = explicitKind(node as ErrorLike);
    if (kind !== undefined) {
      return kind;
    }
    node = (node as ErrorLike).cause;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    IMPLEMENTATION_ERROR_NAMES.has((error as ErrorLike).name as string)
  ) {
    return FailureKind.ProtocolViolation;
  }
  return FailureKind.Permanent;
}

/**
 * Indica si reintentar la misma llamada puede funcionar. Solo `Transient`:
 * un `Timeout` o un `Cancelled` dejan el resultado incierto y quien llama
 * decide según la operación sea idempotente o no.
 */
export function isTransientError(error: unknown): boolean {
  return classifyFailure(error) === FailureKind.Transient;
}

/** Tope por defecto de `retryAfterMs`. */
export const DEFAULT_RETRY_AFTER_MAX_MS = 60_000;

/** Longitud máxima de un encabezado `Retry-After` que se intenta interpretar. */
const MAX_RETRY_AFTER_LENGTH = 64;

const DELAY_SECONDS = /^\d{1,10}$/;

/**
 * Espera sugerida por el servidor, en milisegundos, acotada a `[0, maxMs]`.
 * @param value Encabezado `Retry-After` (segundos enteros o fecha HTTP), segundos
 *   como número o una fecha.
 * @param maxMs Tope de la espera. Por defecto `DEFAULT_RETRY_AFTER_MAX_MS`.
 * @param nowMs Hora actual en milisegundos epoch, para las fechas.
 * @returns undefined si el valor falta o no se puede interpretar.
 */
export function retryAfterMs(
  value: string | number | Date | null | undefined,
  maxMs: number = DEFAULT_RETRY_AFTER_MAX_MS,
  nowMs: number = Date.now(),
): number | undefined {
  if (!Number.isFinite(maxMs) || maxMs < 0) {
    throw new InvalidArgumentError('maxMs', 'a finite number >= 0');
  }
  const delay = rawRetryAfterMs(value, nowMs);
  if (delay === undefined || Number.isNaN(delay)) {
    return undefined;
  }
  return Math.min(maxMs, Math.max(0, Math.ceil(delay)));
}

function rawRetryAfterMs(
  value: string | number | Date | null | undefined,
  nowMs: number,
): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value * 1000 : undefined;
  }
  if (value instanceof Date) {
    return value.getTime() - nowMs;
  }
  if (typeof value !== 'string' || value.length > MAX_RETRY_AFTER_LENGTH) {
    return undefined;
  }
  const trimmed = value.trim();
  if (DELAY_SECONDS.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  // Solo una fecha HTTP con nombre de día (IMF-fixdate, RFC 850 o asctime);
  // evita que Date.parse acepte números sueltos u otros formatos ambiguos.
  if (!/^[A-Za-z]{3}/.test(trimmed)) {
    return undefined;
  }
  const at = Date.parse(trimmed);
  return Number.isNaN(at) ? undefined : at - nowMs;
}
