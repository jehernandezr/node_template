import type { MfaRecovery } from './mfa-recovery.js';
import type { TotpFactor } from './totp-factor.js';

/** Factores de segundo nivel de un usuario, en su shard. */
export abstract class MfaFactorRepository {
  abstract findTotp(userId: string): Promise<TotpFactor | undefined>;
  abstract saveTotp(factor: TotpFactor): Promise<void>;
  abstract deleteTotp(userId: string): Promise<void>;

  /** Reemplaza los códigos de recuperación por las huellas nuevas. */
  abstract replaceRecoveryCodes(
    userId: string,
    hashes: readonly string[],
  ): Promise<void>;
  abstract countRecoveryCodes(userId: string): Promise<number>;
  /** Marca usado el código con esa huella. Devuelve `false` si no existe o ya se usó. */
  abstract useRecoveryCode(
    userId: string,
    hash: string,
    at: Date,
  ): Promise<boolean>;

  abstract insertRecovery(recovery: MfaRecovery): Promise<void>;
  abstract findRecoveryByToken(
    userId: string,
    tokenHash: string,
  ): Promise<MfaRecovery | undefined>;
  abstract countRecoveriesSince(userId: string, since: Date): Promise<number>;
  abstract updateRecovery(recovery: MfaRecovery): Promise<void>;
}
