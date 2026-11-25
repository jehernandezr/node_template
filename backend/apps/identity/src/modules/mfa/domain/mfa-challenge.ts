import type { MfaFactor } from '@contracts/identity';

/** A second factor challenge of a pending authentication. */
export interface MfaChallengeRecord {
  readonly id: string;
  readonly pendingId: string;
  readonly method: MfaFactor;
  /** Hash of the sent code; empty for TOTP and recovery codes, which send no code. */
  readonly codeHash?: string;
  readonly expiresAt: Date;
}
