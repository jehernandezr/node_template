import type { MfaFactor } from '@contracts/identity';

/** Un desafío de segundo factor de una autenticación pendiente. */
export interface MfaChallengeRecord {
  readonly id: string;
  readonly pendingId: string;
  readonly method: MfaFactor;
  /** Huella del código enviado; sin valor para TOTP y códigos de recuperación, que no envían código. */
  readonly codeHash?: string;
  readonly expiresAt: Date;
}
