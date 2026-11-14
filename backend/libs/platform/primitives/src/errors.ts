import { PlatformErrorCode } from '@contracts/platform';
import { FailureKind, PlatformError } from '@platform/kernel';

/** Códigos de error de `@platform/primitives`. */
export type PrimitivesErrorCode =
  | PlatformErrorCode.PrimitivesInvalidArgument
  | PlatformErrorCode.PrimitivesNonJsonValue
  | PlatformErrorCode.PrimitivesDeadlineExceeded
  | PlatformErrorCode.PrimitivesStaleClaim;

/** Un argumento no cumple el rango o el tipo esperado. Es un error de programación. */
export class InvalidArgumentError extends PlatformError {
  override readonly code = PlatformErrorCode.PrimitivesInvalidArgument;
  readonly failureKind = FailureKind.ProtocolViolation;

  constructor(argument: string, expectation: string) {
    super(`Invalid argument "${argument}": ${expectation}`, {
      details: { argument, expectation },
    });
  }
}

/**
 * El valor no se puede representar como JSON canónico. `path` señala la
 * posición (por ejemplo `$.items[2].price`); no se incluye el valor.
 */
export class NonJsonValueError extends PlatformError {
  override readonly code = PlatformErrorCode.PrimitivesNonJsonValue;
  readonly failureKind = FailureKind.ProtocolViolation;

  constructor(path: string, reason: string) {
    super(`Value at ${path} is not canonical JSON: ${reason}`, {
      details: { path, reason },
    });
  }
}

/** Se agotó el presupuesto de tiempo de la operación. */
export class DeadlineExceededError extends PlatformError {
  override readonly code = PlatformErrorCode.PrimitivesDeadlineExceeded;
  readonly failureKind = FailureKind.Timeout;

  constructor(deadlineAtMs: number) {
    super('Deadline exceeded', { details: { deadlineAtMs } });
  }
}

/**
 * El token de un claim de idempotencia ya no es el vigente: otro intento tomó
 * el lease, la operación ya terminó o el claim se liberó.
 */
export class StaleClaimError extends PlatformError {
  override readonly code = PlatformErrorCode.PrimitivesStaleClaim;
  readonly failureKind = FailureKind.Permanent;

  constructor(operation: 'complete' | 'release') {
    super(`Cannot ${operation}: the claim token is no longer current`, {
      details: { operation },
    });
  }
}
