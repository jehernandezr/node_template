import { PlatformErrorCode } from '@contracts/platform';
import { PlatformError } from '@platform/kernel';
import { classifyFailure, FailureKind } from '@platform/primitives';
import { PersistenceErrorCode } from './enums.js';

const FAILURE_KIND: Readonly<
  Record<
    Exclude<PersistenceErrorCode, PersistenceErrorCode.QueryFailed>,
    FailureKind
  >
> = {
  [PersistenceErrorCode.InvalidConfiguration]: FailureKind.ProtocolViolation,
  [PersistenceErrorCode.TransactionRequired]: FailureKind.ProtocolViolation,
  [PersistenceErrorCode.TenantRequired]: FailureKind.ProtocolViolation,
  [PersistenceErrorCode.TenantMismatch]: FailureKind.ProtocolViolation,
  [PersistenceErrorCode.CorruptRow]: FailureKind.Permanent,
  [PersistenceErrorCode.Contention]: FailureKind.Transient,
};

/** Opciones de un {@link PersistenceError}. */
export interface PersistenceErrorOptions {
  /** Datos de diagnóstico. Nunca valores de filas ni parámetros de la sentencia. */
  readonly details?: Readonly<Record<string, unknown>>;
  readonly cause?: unknown;
  /** Clase de la falla. Solo `QueryFailed` la toma de aquí; el resto la fija por código. */
  readonly failureKind?: FailureKind;
}

/**
 * Error de la capa de persistencia. `failureKind` y `retryable` salen del código,
 * salvo en `QueryFailed`, donde salen de la causa (SQLSTATE o código de red).
 */
export class PersistenceError extends PlatformError {
  override readonly code: PersistenceErrorCode;
  readonly failureKind: FailureKind;

  constructor(
    code: PersistenceErrorCode,
    message: string,
    options: PersistenceErrorOptions = {},
  ) {
    const failureKind =
      code === PersistenceErrorCode.QueryFailed
        ? (options.failureKind ?? classifyFailure(options.cause))
        : FAILURE_KIND[code];
    super(message, {
      retryable: failureKind === FailureKind.Transient,
      details: options.details,
      cause: options.cause,
    });
    this.code = code;
    this.failureKind = failureKind;
  }
}

/**
 * La fila cambió desde que se leyó: la `version` esperada ya no es la guardada.
 * Responde `PLATFORM.CONFLICT.VERSION_MISMATCH` (409). No se reintenta tal cual:
 * quien llama vuelve a leer y decide.
 */
export class OptimisticLockError extends PlatformError {
  override readonly code = PlatformErrorCode.ConflictVersionMismatch;
  readonly failureKind = FailureKind.Permanent;

  constructor(table: string, expectedVersion: number) {
    super('The row changed since it was read', {
      details: { table, expectedVersion },
    });
  }
}

/** Error de configuración, con la opción que falló y lo que se esperaba. */
export function invalidConfiguration(
  option: string,
  expectation: string,
): PersistenceError {
  return new PersistenceError(
    PersistenceErrorCode.InvalidConfiguration,
    `${option} must be ${expectation}`,
    { details: { option } },
  );
}

/** SQLSTATE de un error de `pg`, si lo trae. */
export function sqlStateOf(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)
    ? code
    : undefined;
}

/**
 * Envuelve un error del driver en `QueryFailed`. Los `PlatformError` pasan tal
 * cual. El mensaje no copia el texto del driver, que puede incluir valores.
 */
export function toPersistenceError(error: unknown): PlatformError {
  if (error instanceof PlatformError) {
    return error;
  }
  const sqlState = sqlStateOf(error);
  return new PersistenceError(
    PersistenceErrorCode.QueryFailed,
    'Database statement failed',
    {
      cause: error,
      details: sqlState === undefined ? undefined : { sqlState },
    },
  );
}
