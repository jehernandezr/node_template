import {
  MfaRecoveryStatus,
  type MfaRecovery,
} from '../../domain/mfa-recovery.js';
import { MfaFactorRepository } from '../../domain/mfa-factor-repository.js';
import type { TotpFactor } from '../../domain/totp-factor.js';

/** Second factors and recoveries kept in memory, per user. */
export class InMemoryMfaFactors extends MfaFactorRepository {
  private readonly totps = new Map<string, TotpFactor>();
  private readonly codes = new Map<string, Set<string>>();
  private readonly recoveries = new Map<string, MfaRecovery>();

  override async findTotp(userId: string): Promise<TotpFactor | undefined> {
    return this.totps.get(userId);
  }

  override async saveTotp(factor: TotpFactor): Promise<void> {
    this.totps.set(factor.userId, factor);
  }

  override async deleteTotp(userId: string): Promise<void> {
    this.totps.delete(userId);
  }

  override async replaceRecoveryCodes(
    userId: string,
    hashes: readonly string[],
  ): Promise<void> {
    this.codes.set(userId, new Set(hashes));
  }

  override async countRecoveryCodes(userId: string): Promise<number> {
    return this.codes.get(userId)?.size ?? 0;
  }

  override async useRecoveryCode(
    userId: string,
    hash: string,
  ): Promise<boolean> {
    return this.codes.get(userId)?.delete(hash) ?? false;
  }

  override async insertRecovery(recovery: MfaRecovery): Promise<void> {
    this.recoveries.set(recovery.id, recovery);
  }

  override async findRecoveryByToken(
    userId: string,
    tokenHash: string,
  ): Promise<MfaRecovery | undefined> {
    return [...this.recoveries.values()].find(
      (recovery) =>
        recovery.userId === userId && recovery.tokenHash === tokenHash,
    );
  }

  override async countRecoveriesSince(
    userId: string,
    since: Date,
  ): Promise<number> {
    return [...this.recoveries.values()].filter(
      (recovery) => recovery.userId === userId && recovery.requestedAt >= since,
    ).length;
  }

  override async updateRecovery(recovery: MfaRecovery): Promise<void> {
    this.recoveries.set(recovery.id, recovery);
  }

  override async cancelPendingRecoveries(userId: string): Promise<number> {
    let cancelled = 0;
    for (const recovery of this.recoveries.values()) {
      if (
        recovery.userId === userId &&
        recovery.status === MfaRecoveryStatus.Pending
      ) {
        this.recoveries.set(recovery.id, {
          ...recovery,
          status: MfaRecoveryStatus.Cancelled,
        });
        cancelled += 1;
      }
    }
    return cancelled;
  }

  override async forget(userId: string): Promise<void> {
    this.totps.delete(userId);
    this.codes.delete(userId);
  }

  /** The stored recoveries of a user. */
  recoveriesOf(userId: string): readonly MfaRecovery[] {
    return [...this.recoveries.values()].filter(
      (recovery) => recovery.userId === userId,
    );
  }
}
