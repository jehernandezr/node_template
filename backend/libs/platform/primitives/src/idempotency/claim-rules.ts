import type { ClaimRequest } from '@platform/kernel';
import { PrimitivesGuard } from '../errors/primitives-guard.js';

/** Reglas comunes de los claims de idempotencia que los adaptadores aplican antes de tocar el almacenamiento. */
export class ClaimRules {
  /** Margen por defecto entre el límite de la operación y el fin del lease. */
  static readonly DEFAULT_LEASE_MARGIN_MS = 5_000;

  /** Longitud máxima de una llave de idempotencia. */
  static readonly MAX_KEY_LENGTH = 512;

  /** Longitud máxima de una huella. */
  static readonly MAX_FINGERPRINT_LENGTH = 256;

  /**
   * Fin del lease en milisegundos epoch: el límite más el margen, y al menos
   * `minLeaseMs` desde `nowMs`. Así el lease siempre cubre la operación completa.
   */
  static computeLeaseUntil(
    request: Pick<ClaimRequest, 'deadline' | 'leaseMarginMs' | 'minLeaseMs'>,
    nowMs: number,
  ): number {
    const margin = request.leaseMarginMs ?? ClaimRules.DEFAULT_LEASE_MARGIN_MS;
    const minimum = request.minLeaseMs ?? 0;
    PrimitivesGuard.instance.nonNegativeFinite('leaseMarginMs', margin);
    PrimitivesGuard.instance.nonNegativeFinite('minLeaseMs', minimum);
    return Math.max(request.deadline.atMs + margin, nowMs + minimum);
  }

  /** Valida la llave y la huella. Lanza `InvalidArgumentError`. */
  static assertInput(key: string, fingerprint: string): void {
    PrimitivesGuard.instance.integerInRange(
      'key',
      typeof key === 'string' ? key.length : -1,
      1,
      ClaimRules.MAX_KEY_LENGTH,
    );
    PrimitivesGuard.instance.integerInRange(
      'fingerprint',
      typeof fingerprint === 'string' ? fingerprint.length : -1,
      1,
      ClaimRules.MAX_FINGERPRINT_LENGTH,
    );
  }
}
