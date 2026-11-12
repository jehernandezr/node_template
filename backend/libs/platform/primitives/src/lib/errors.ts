import { PlatformError } from '@platform/kernel';
import { FailureKind } from './failure-kind.js';

/** Códigos de error de `@platform/primitives`. */
export enum PrimitivesErrorCode {
  InvalidArgument = 'PLATFORM.PRIMITIVES.INVALID_ARGUMENT',
  NonJsonValue = 'PLATFORM.PRIMITIVES.NON_JSON_VALUE',
  DeadlineExceeded = 'PLATFORM.PRIMITIVES.DEADLINE_EXCEEDED',
  StaleClaim = 'PLATFORM.PRIMITIVES.STALE_CLAIM',
}

/** Un argumento no cumple el rango o el tipo esperado. Es un error de programación. */
export class InvalidArgumentError extends PlatformError {
  override readonly code = PrimitivesErrorCode.InvalidArgument;
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
  override readonly code = PrimitivesErrorCode.NonJsonValue;
  readonly failureKind = FailureKind.ProtocolViolation;

  constructor(path: string, reason: string) {
    super(`Value at ${path} is not canonical JSON: ${reason}`, {
      details: { path, reason },
    });
  }
}

/** Se agotó el presupuesto de tiempo de la operación. */
export class DeadlineExceededError extends PlatformError {
  override readonly code = PrimitivesErrorCode.DeadlineExceeded;
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
  override readonly code = PrimitivesErrorCode.StaleClaim;
  readonly failureKind = FailureKind.Permanent;

  constructor(operation: 'complete' | 'release') {
    super(`Cannot ${operation}: the claim token is no longer current`, {
      details: { operation },
    });
  }
}
