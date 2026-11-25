import type { ClaimRequest } from '@platform/kernel';
import { PrimitivesGuard } from '../errors/primitives-guard.js';

/** Common rules for idempotency claims that adapters apply before touching storage. */
export class ClaimRules {
  /** Default margin between the operation deadline and the end of the lease. */
  static readonly DEFAULT_LEASE_MARGIN_MS = 5_000;

  /** Maximum length of an idempotency key. */
  static readonly MAX_KEY_LENGTH = 512;

  /** Maximum length of a fingerprint. */
  static readonly MAX_FINGERPRINT_LENGTH = 256;

  /**
   * Returns the lease end in epoch milliseconds: the deadline plus the margin, and at least
   * `minLeaseMs` from `nowMs`. So the lease always covers the whole operation.
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

  /** Validates the key and the fingerprint. Throws `InvalidArgumentError`. */
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
