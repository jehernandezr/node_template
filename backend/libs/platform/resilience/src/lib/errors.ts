import { PlatformError } from '@platform/kernel';
import { FailureKind } from '@platform/primitives';

/** Códigos de error estables de `@platform/resilience`. */
export enum ResilienceErrorCode {
  CircuitOpen = 'PLATFORM.RESILIENCE.CIRCUIT_OPEN',
  Timeout = 'PLATFORM.RESILIENCE.TIMEOUT',
  BulkheadFull = 'PLATFORM.RESILIENCE.BULKHEAD_FULL',
  Overloaded = 'PLATFORM.RESILIENCE.OVERLOADED',
  UnknownPolicy = 'PLATFORM.RESILIENCE.UNKNOWN_POLICY',
  NotConfigured = 'PLATFORM.RESILIENCE.NOT_CONFIGURED',
}

/** Opciones de {@link ResilienceError}. */
export interface ResilienceErrorOptions {
  /** Error que lo originó. */
  readonly cause?: unknown;
  /** Espera sugerida antes de reintentar, en milisegundos. */
  readonly retryAfterMs?: number;
  /** Datos de diagnóstico sin secretos ni valores de entrada. */
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Clase de falla y si se puede reintentar, por código.
 * - Circuito abierto, bulkhead lleno y sobrecarga: la llamada nunca se ejecutó,
 *   así que repetirla más tarde es seguro (`Transient`).
 * - Tiempo agotado: el efecto pudo aplicarse (`Timeout`); solo quien sabe que
 *   la operación es idempotente decide repetirla.
 * - Política desconocida o registro sin configurar: error de programación.
 */
const CLASSIFICATION: Readonly<
  Record<ResilienceErrorCode, { kind: FailureKind; retryable: boolean }>
> = {
  [ResilienceErrorCode.CircuitOpen]: {
    kind: FailureKind.Transient,
    retryable: true,
  },
  [ResilienceErrorCode.BulkheadFull]: {
    kind: FailureKind.Transient,
    retryable: true,
  },
  [ResilienceErrorCode.Overloaded]: {
    kind: FailureKind.Transient,
    retryable: true,
  },
  [ResilienceErrorCode.Timeout]: {
    kind: FailureKind.Timeout,
    retryable: false,
  },
  [ResilienceErrorCode.UnknownPolicy]: {
    kind: FailureKind.ProtocolViolation,
    retryable: false,
  },
  [ResilienceErrorCode.NotConfigured]: {
    kind: FailureKind.ProtocolViolation,
    retryable: false,
  },
};

/**
 * Error que lanza una política de resiliencia al rechazar o cortar una llamada.
 * `failureKind` y `retryable` salen del código, así que `classifyFailure` de
 * `@platform/primitives` lo clasifica sin reglas propias.
 */
export class ResilienceError extends PlatformError {
  override readonly code: ResilienceErrorCode;
  /** Clase de la falla para `classifyFailure`. */
  readonly failureKind: FailureKind;
  /** Espera sugerida antes de reintentar, cuando se conoce. */
  readonly retryAfterMs?: number;

  constructor(
    code: ResilienceErrorCode,
    message: string,
    options: ResilienceErrorOptions = {},
  ) {
    const { kind, retryable } = CLASSIFICATION[code];
    super(message, {
      retryable,
      cause: options.cause,
      details: options.details,
    });
    this.code = code;
    this.failureKind = kind;
    this.retryAfterMs = options.retryAfterMs;
  }
}

/** El circuito de la dependencia está abierto; la llamada no se ejecutó. */
export class CircuitOpenError extends ResilienceError {
  constructor(
    policy: string,
    dependencyKey: string,
    options: ResilienceErrorOptions = {},
  ) {
    super(
      ResilienceErrorCode.CircuitOpen,
      `Circuit open for policy "${policy}"`,
      { ...options, details: { policy, dependencyKey } },
    );
  }
}

/** Alcance de un tiempo agotado. */
export enum TimeoutScope {
  /** Se agotó el tiempo de un intento. */
  Attempt = 'attempt',
  /** Se agotó el presupuesto total de la llamada (deadline). */
  Total = 'total',
}

/** Se agotó el tiempo de un intento o el presupuesto total de la llamada. */
export class ResilienceTimeoutError extends ResilienceError {
  readonly scope: TimeoutScope;
  readonly timeoutMs: number;

  constructor(
    policy: string,
    scope: TimeoutScope,
    timeoutMs: number,
    options: ResilienceErrorOptions = {},
  ) {
    super(ResilienceErrorCode.Timeout, `Call to policy "${policy}" timed out`, {
      ...options,
      details: { policy, scope, timeoutMs },
    });
    this.scope = scope;
    this.timeoutMs = timeoutMs;
  }
}

/** El bulkhead de la dependencia no tiene cupo ni cola; la llamada no se ejecutó. */
export class BulkheadFullError extends ResilienceError {
  constructor(
    policy: string,
    dependencyKey: string,
    options: ResilienceErrorOptions = {},
  ) {
    super(
      ResilienceErrorCode.BulkheadFull,
      `Bulkhead full for policy "${policy}"`,
      { ...options, details: { policy, dependencyKey } },
    );
  }
}

/** El servicio rechaza trabajo por sobrecarga; la llamada no se ejecutó. */
export class OverloadedError extends ResilienceError {
  constructor(retryAfterMs: number) {
    super(ResilienceErrorCode.Overloaded, 'Service overloaded, shedding load', {
      retryAfterMs,
    });
  }
}

/** No existe una política con ese nombre. */
export class UnknownPolicyError extends ResilienceError {
  constructor(policy: string) {
    super(
      ResilienceErrorCode.UnknownPolicy,
      `Unknown resilience policy "${policy}"`,
      { details: { policy } },
    );
  }
}

/** El decorador `@Resilient` se usó sin registro por defecto o sobre algo que no es un método. */
export class ResilienceNotConfiguredError extends ResilienceError {
  constructor(message: string, policy: string) {
    super(ResilienceErrorCode.NotConfigured, message, { details: { policy } });
  }
}
