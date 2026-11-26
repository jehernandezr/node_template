import { Injectable } from '@nestjs/common';
import { LockoutRules } from '../../../shared/constants/lockout.constants.js';
import { AttemptCounters } from '../domain/attempt-counters.js';
import type { FailureOutcome } from '../domain/failure-outcome.js';
import { LockoutPolicy } from '../domain/lockout-policy.js';
import { LockoutStore } from '../domain/lockout-store.js';
import { LockoutKeys } from './lockout-keys.js';

/**
 * Lockout for failed attempts of an account (or of an API key, which counts as one) from an IP: counts
 * failures with `AttemptCounters`, decides with `LockoutPolicy` and stores the lockout in `LockoutStore`. The
 * origin carries the account's unlock epoch, so unlocking it leaves all its origins behind.
 */
@Injectable()
export class LoginLockout {
  private readonly policy = new LockoutPolicy();

  constructor(
    private readonly counters: AttemptCounters,
    private readonly store: LockoutStore,
    private readonly keys: LockoutKeys,
  ) {}

  /**
   * Milliseconds left of the account lockout from that IP or of the IP lockout; `undefined` without a lockout.
   * @param account Account key.
   * @param ip IP of the attempt.
   * @returns The remaining milliseconds, or `undefined`.
   */
  async remainingLockMs(
    account: string,
    ip: string,
  ): Promise<number | undefined> {
    return this.store.remainingLockMs(await this.originOf(account, ip), ip);
  }

  /**
   * Tells whether the account is in protected mode, which asks for the second factor on every sign-in.
   * @param account Account key.
   * @returns `true` when protected.
   */
  isProtected(account: string): Promise<boolean> {
    return this.store.isProtected(account);
  }

  /**
   * Counts the failure and activates the corresponding lockouts.
   * Only whoever activates protected mode reports it: subsequent failures already find it active.
   * @param account Account key.
   * @param ip IP of the attempt.
   * @returns The lockouts the failure caused.
   */
  async recordFailure(account: string, ip: string): Promise<FailureOutcome> {
    const origin = await this.originOf(account, ip);
    const counts = await this.counters.recordFailure(origin, account, ip);
    const protectedModeEnabled =
      this.policy.enablesProtectedMode(counts.account) &&
      (await this.store.protect(account, LockoutRules.origin.maxLockMs));
    if (this.policy.locksIp(counts.ip)) {
      await this.store.lockIp(ip, LockoutRules.ip.lockMs);
    }
    if (!this.policy.locksOrigin(counts.origin)) {
      return { protectedModeEnabled };
    }
    const level = await this.store.raiseLevel(
      origin,
      LockoutRules.origin.maxLockMs,
    );
    const lockedForMs = this.policy.originLockMs(level);
    await this.store.lockOrigin(origin, lockedForMs);
    await this.store.retainEpoch(account, LockoutRules.unlockEpochTtlMs);
    await this.counters.clearOrigin(origin);
    return { lockedForMs, protectedModeEnabled };
  }

  /**
   * A successful sign-in forgets the failures of its origin.
   * @param account Account key.
   * @param ip IP of the attempt.
   */
  async clear(account: string, ip: string): Promise<void> {
    await this.counters.clearOrigin(await this.originOf(account, ip));
  }

  /**
   * Removes the lockouts of all the account's origins, its protected mode and its failures.
   * @param account Account key.
   */
  async unlock(account: string): Promise<void> {
    await this.store.unlock(account, LockoutRules.unlockEpochTtlMs);
    await this.counters.clearAccount(account);
  }

  private async originOf(account: string, ip: string): Promise<string> {
    const epoch = await this.store.unlockEpoch(account);
    return this.keys.origin(`${account}:${epoch}`, ip);
  }
}
