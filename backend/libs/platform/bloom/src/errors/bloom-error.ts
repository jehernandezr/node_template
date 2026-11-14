import { FailureKind, PlatformError } from '@platform/kernel';
import type { BloomErrorCode } from './bloom-error-code.enum.js';

/**
 * Base de los errores de `@platform/bloom`. Cada subclase elige su clase de
 * falla: un parámetro inválido es un error de programación, y los datos
 * corruptos no se arreglan reintentando.
 */
export class BloomError extends PlatformError {
  override readonly code: BloomErrorCode;

  constructor(code: BloomErrorCode, message: string, failureKind: FailureKind) {
    super(message, { failureKind, retryable: false });
    this.code = code;
  }
}
