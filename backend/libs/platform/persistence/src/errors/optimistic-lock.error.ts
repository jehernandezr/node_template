import { PlatformErrorCode } from '@contracts/platform';
import { FailureKind, PlatformError } from '@platform/kernel';

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
