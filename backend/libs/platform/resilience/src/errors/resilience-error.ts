import { FailureKind, PlatformError } from '@platform/kernel';
import { ResilienceErrorCode } from './resilience-error-code.enum.js';

/** Opciones de {@link ResilienceError}. */
export interface ResilienceErrorOptions {
  readonly cause?: unknown;
  /** Espera sugerida antes de reintentar, en milisegundos. */
  readonly retryAfterMs?: number;
  /** Datos de diagnóstico, sin secretos ni valores de entrada. */
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * Error que lanza una política al rechazar o cortar una llamada. La clase de
 * falla sale del código: un circuito abierto o un bulkhead lleno no corrieron
 * la llamada, así que reintentarla es seguro; un timeout deja el efecto
 * incierto; una política desconocida o inválida es un error de programación.
 */
export class ResilienceError extends PlatformError {
  private static readonly FAILURE_KINDS: Readonly<
    Record<ResilienceErrorCode, FailureKind>
  > = {
    [ResilienceErrorCode.CircuitOpen]: FailureKind.Transient,
    [ResilienceErrorCode.BulkheadFull]: FailureKind.Transient,
    [ResilienceErrorCode.Timeout]: FailureKind.Timeout,
    [ResilienceErrorCode.UnknownPolicy]: FailureKind.ProtocolViolation,
    [ResilienceErrorCode.InvalidPolicy]: FailureKind.ProtocolViolation,
  };

  override readonly code: ResilienceErrorCode;
  /** Espera sugerida antes de reintentar, cuando se conoce. */
  readonly retryAfterMs?: number;

  constructor(
    code: ResilienceErrorCode,
    message: string,
    options: ResilienceErrorOptions = {},
  ) {
    const kind = ResilienceError.FAILURE_KINDS[code];
    super(message, {
      retryable: kind === FailureKind.Transient,
      failureKind: kind,
      cause: options.cause,
      details: options.details,
    });
    this.code = code;
    this.retryAfterMs = options.retryAfterMs;
  }
}
