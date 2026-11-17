import { DomainError } from '@platform/kernel';
import type { IdentityErrorCode } from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';

/** Códigos de la plataforma que un caso de uso de identity puede responder sin depender de HTTP. */
export type IdentityPlatformCode =
  PlatformErrorCode.ResourceNotFound | PlatformErrorCode.AuthForbidden;

/**
 * Regla de negocio de identity que no se cumple. El código sale del catálogo del contrato, que fija el
 * estado HTTP y la audiencia; `details.retryAfterSeconds` se convierte en `Retry-After`.
 */
export class IdentityError extends DomainError {
  constructor(
    readonly code: IdentityErrorCode | IdentityPlatformCode,
    message: string = code,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message, details);
  }

  /** El recurso no existe o no es visible para quien pregunta: no revela cuál de los dos. */
  static notFound(): IdentityError {
    return new IdentityError(PlatformErrorCode.ResourceNotFound);
  }

  /** Quien actúa no tiene los permisos `missing`. */
  static forbidden(missing: readonly string[]): IdentityError {
    return new IdentityError(PlatformErrorCode.AuthForbidden, 'Access denied', {
      missing: [...new Set(missing)],
    });
  }

  /** Un error que pide esperar: el cliente recibe `Retry-After` con los segundos que faltan. */
  static retryAfter(code: IdentityErrorCode, waitMs: number): IdentityError {
    return new IdentityError(code, code, {
      retryAfterSeconds: Math.max(1, Math.ceil(waitMs / 1000)),
    });
  }
}
