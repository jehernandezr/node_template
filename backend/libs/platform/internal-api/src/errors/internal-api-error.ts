import { FailureKind, PlatformError } from '@platform/kernel';
import { InternalApiErrorCode } from './internal-api-error-code.enum.js';

/**
 * Se lanza por violaciones del contrato al definir o registrar operaciones, y
 * por configuración inválida. Las llamadas nunca lo lanzan: el cliente y el
 * router informan los problemas de contrato como un `CallOutcome`.
 */
export class InternalApiError extends PlatformError {
  override readonly code: InternalApiErrorCode;

  constructor(
    code: InternalApiErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    // Un contrato roto es una violación de protocolo para el clasificador.
    super(message, {
      failureKind: FailureKind.ProtocolViolation,
      ...(details === undefined ? {} : { details }),
    });
    this.code = code;
  }
}
