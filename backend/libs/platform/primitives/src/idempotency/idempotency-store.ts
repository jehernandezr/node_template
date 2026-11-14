import { ClaimRules } from './claim-rules.js';

export {
  ClaimState,
  IdempotencyStore,
  type AcquiredClaim,
  type ClaimRequest,
  type ClaimResult,
  type CompletedClaim,
  type InProgressClaim,
} from '@platform/kernel';

/** @deprecated Usa `ClaimRules.DEFAULT_LEASE_MARGIN_MS`. */
export const DEFAULT_LEASE_MARGIN_MS = ClaimRules.DEFAULT_LEASE_MARGIN_MS;

/** @deprecated Usa `ClaimRules.MAX_KEY_LENGTH`. */
export const MAX_IDEMPOTENCY_KEY_LENGTH = ClaimRules.MAX_KEY_LENGTH;

/** @deprecated Usa `ClaimRules.MAX_FINGERPRINT_LENGTH`. */
export const MAX_FINGERPRINT_LENGTH = ClaimRules.MAX_FINGERPRINT_LENGTH;

/** @deprecated Usa `ClaimRules.computeLeaseUntil`. */
export const computeLeaseUntil = ClaimRules.computeLeaseUntil;

/** @deprecated Usa `ClaimRules.assertInput`. */
export const assertClaimInput = ClaimRules.assertInput;
