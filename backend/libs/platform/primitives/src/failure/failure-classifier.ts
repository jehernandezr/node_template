import { FailureKind } from '@platform/kernel';
import type { FailureRule } from './failure-rule.js';

/** Propiedades de un error que el clasificador sabe leer. */
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
 * Clasifica cualquier valor lanzado. Recorre el error y su cadena `cause`
 * (hasta `MAX_CAUSE_DEPTH` niveles) y usa la primera señal explícita, de
 * afuera hacia adentro:
 * 1. Las reglas inyectadas (los adaptadores traducen aquí los errores de su
 *    proveedor: Postgres, AWS, Valkey).
 * 2. Una propiedad `failureKind` con un valor de `FailureKind`.
 * 3. `name` `AbortError` (cancelado) o `TimeoutError` (tiempo agotado).
 * 4. `retryable: true`.
 * 5. Un código de red de Node o de su `fetch`.
 * 6. Un estado HTTP: 408, 425, 429, 502, 503 y 504 son pasajeros; el resto de
 *    4xx y 5xx, permanentes.
 *
 * Sin señal, un `TypeError`, `ReferenceError`, `SyntaxError`, `RangeError` o
 * `ZodError` es una violación de protocolo, y cualquier otra cosa es
 * permanente. Lo desconocido no se reintenta.
 */
export class FailureClassifier {
  /** Niveles de `cause` que se revisan además del error de arriba. */
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

  /** Errores de JavaScript que delatan un fallo de implementación cuando nada más los explica. */
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

  /** `rules` se consultan en cada nodo de la cadena, antes de las reglas propias. */
  constructor(private readonly rules: readonly FailureRule[] = []) {}

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

  /** Solo `Transient` es reintentable: un `Timeout` o `Cancelled` dejan el resultado incierto. */
  isTransient(error: unknown): boolean {
    return this.classify(error) === FailureKind.Transient;
  }

  /** Clasificación que un nodo declara por sí mismo, o `undefined` si no dice nada. */
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
