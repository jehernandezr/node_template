/** Discriminante de `CallOutcome`. */
export enum CallOutcomeKind {
  Success = 'success',
  BusinessError = 'business-error',
  ProtocolViolation = 'protocol-violation',
  TransientFailure = 'transient-failure',
  Uncertain = 'uncertain',
}

/** La llamada terminó y devolvió un valor válido. */
export interface SuccessOutcome<T> {
  readonly kind: CallOutcomeKind.Success;
  readonly value: T;
}

/** La llamada terminó con un error de negocio declarado por el contrato. Es final. */
export interface BusinessErrorOutcome {
  readonly kind: CallOutcomeKind.BusinessError;
  readonly code: string;
  readonly message?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Contrato roto o fallo de implementación. Nunca se reintenta ni se guarda. */
export interface ProtocolViolationOutcome {
  readonly kind: CallOutcomeKind.ProtocolViolation;
  readonly reason: string;
  readonly code?: string;
}

/** La llamada no produjo efectos y reintentarla puede funcionar. */
export interface TransientFailureOutcome {
  readonly kind: CallOutcomeKind.TransientFailure;
  readonly reason: string;
  /** Espera sugerida antes de reintentar, en milisegundos. */
  readonly retryAfterMs?: number;
  readonly cause?: unknown;
}

/**
 * No se sabe si la llamada aplicó sus efectos (tiempo agotado o cancelación
 * después de enviar). Solo se reintenta si la operación es idempotente; si no,
 * se consulta el estado o se compensa.
 */
export interface UncertainOutcome {
  readonly kind: CallOutcomeKind.Uncertain;
  readonly reason: string;
  readonly cause?: unknown;
}

/** Resultado de una llamada entre procesos. Quien llama decide según `kind`. */
export type CallOutcome<T> =
  | SuccessOutcome<T>
  | BusinessErrorOutcome
  | ProtocolViolationOutcome
  | TransientFailureOutcome
  | UncertainOutcome;

/** Resultado final: ya no cambia al repetir la llamada y se puede guardar para idempotencia. */
export type FinalOutcome<T> = SuccessOutcome<T> | BusinessErrorOutcome;

function success<T>(value: T): SuccessOutcome<T> {
  return { kind: CallOutcomeKind.Success, value };
}

function businessError(
  code: string,
  options: {
    readonly message?: string;
    readonly details?: Readonly<Record<string, unknown>>;
  } = {},
): BusinessErrorOutcome {
  return { kind: CallOutcomeKind.BusinessError, code, ...options };
}

function protocolViolation(
  reason: string,
  code?: string,
): ProtocolViolationOutcome {
  return code === undefined
    ? { kind: CallOutcomeKind.ProtocolViolation, reason }
    : { kind: CallOutcomeKind.ProtocolViolation, reason, code };
}

function transientFailure(
  reason: string,
  options: { readonly retryAfterMs?: number; readonly cause?: unknown } = {},
): TransientFailureOutcome {
  return { kind: CallOutcomeKind.TransientFailure, reason, ...options };
}

function uncertain(reason: string, cause?: unknown): UncertainOutcome {
  return cause === undefined
    ? { kind: CallOutcomeKind.Uncertain, reason }
    : { kind: CallOutcomeKind.Uncertain, reason, cause };
}

/** Constructores de `CallOutcome`. */
export const CallOutcome = {
  success,
  businessError,
  protocolViolation,
  transientFailure,
  uncertain,
} as const;

/** Indica si la llamada devolvió un valor. */
export function isSuccess<T>(
  outcome: CallOutcome<T>,
): outcome is SuccessOutcome<T> {
  return outcome.kind === CallOutcomeKind.Success;
}

/** Indica si el resultado es final (éxito o error de negocio) y se puede guardar. */
export function isFinalOutcome<T>(
  outcome: CallOutcome<T>,
): outcome is FinalOutcome<T> {
  return (
    outcome.kind === CallOutcomeKind.Success ||
    outcome.kind === CallOutcomeKind.BusinessError
  );
}
