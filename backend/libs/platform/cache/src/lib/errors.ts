import { PlatformError } from '@platform/kernel';
import { FailureKind } from '@platform/primitives';

/** Códigos de error estables de `@platform/cache`. */
export enum CacheErrorCode {
  InvalidArgument = 'PLATFORM.CACHE.INVALID_ARGUMENT',
  KeyTooLong = 'PLATFORM.CACHE.KEY_TOO_LONG',
  ValueTooLarge = 'PLATFORM.CACHE.VALUE_TOO_LARGE',
  NotACounter = 'PLATFORM.CACHE.NOT_A_COUNTER',
  Timeout = 'PLATFORM.CACHE.TIMEOUT',
  CorruptEntry = 'PLATFORM.CACHE.CORRUPT_ENTRY',
}

/**
 * Base de los errores de `@platform/cache`. `failureKind` permite que
 * `classifyFailure` de `@platform/primitives` lo clasifique sin reglas propias.
 * Los mensajes no incluyen llaves ni valores del caché.
 */
export abstract class CacheError extends PlatformError {
  abstract override readonly code: CacheErrorCode;
  abstract readonly failureKind: FailureKind;
}

/** Un argumento no cumple el rango o el tipo esperado. Es un error de programación. */
export class CacheInvalidArgumentError extends CacheError {
  override readonly code = CacheErrorCode.InvalidArgument;
  readonly failureKind = FailureKind.ProtocolViolation;

  constructor(argument: string, expectation: string) {
    super(`Invalid argument "${argument}": ${expectation}`, {
      details: { argument, expectation },
    });
  }
}

/** La llave supera el largo permitido. */
export class CacheKeyTooLongError extends CacheError {
  override readonly code = CacheErrorCode.KeyTooLong;
  readonly failureKind = FailureKind.ProtocolViolation;

  constructor(length: number, maxLength: number) {
    super(`Cache key has ${length} characters; the limit is ${maxLength}`, {
      details: { length, maxLength },
    });
  }
}

/** El valor serializado supera el tamaño permitido y no se guarda. */
export class CacheValueTooLargeError extends CacheError {
  override readonly code = CacheErrorCode.ValueTooLarge;
  readonly failureKind = FailureKind.Permanent;

  constructor(bytes: number, maxBytes: number) {
    super(`Cache value has ${bytes} bytes; the limit is ${maxBytes}`, {
      details: { bytes, maxBytes },
    });
  }
}

/** `incr` sobre una llave cuyo valor no es un contador entero. */
export class CacheNotACounterError extends CacheError {
  override readonly code = CacheErrorCode.NotACounter;
  readonly failureKind = FailureKind.Permanent;

  constructor() {
    super('Cached value is not an integer counter');
  }
}

/** Una llamada al caché superó su tiempo máximo. */
export class CacheTimeoutError extends CacheError {
  override readonly code = CacheErrorCode.Timeout;
  readonly failureKind = FailureKind.Timeout;

  constructor(timeoutMs: number) {
    super(`Cache operation exceeded ${timeoutMs} ms`, {
      details: { timeoutMs },
    });
  }
}

/** Una entrada guardada no tiene la forma esperada. */
export class CacheCorruptEntryError extends CacheError {
  override readonly code = CacheErrorCode.CorruptEntry;
  readonly failureKind = FailureKind.ProtocolViolation;

  constructor(reason: string) {
    super(`Cached entry is corrupt: ${reason}`, { details: { reason } });
  }
}
