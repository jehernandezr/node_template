import { LockoutRules } from '../../../shared/constants/lockout.constants.js';

/**
 * Lockout rules for failed attempts: exponential backoff per origin (account and IP), protected mode per
 * account and IP lockout. It is pure computation over the counters.
 */
export class LockoutPolicy {
  /**
   * Lockout number `level` (from 1) lasts 15, 30, 60 minutes... up to 24 hours.
   * @param level Lockout level.
   * @returns Its duration in milliseconds.
   */
  originLockMs(level: number): number {
    return Math.min(
      LockoutRules.origin.baseLockMs * 2 ** Math.max(0, level - 1),
      LockoutRules.origin.maxLockMs,
    );
  }

  /**
   * Tells whether the failures of an origin lock it.
   * @param failures Failures of the origin.
   * @returns `true` when locked.
   */
  locksOrigin(failures: number): boolean {
    return failures >= LockoutRules.origin.maxFailures;
  }

  /**
   * From the threshold on the account enters protected mode; the store reports it only the first time.
   * @param failures Failures of the account.
   * @returns `true` when protected mode turns on.
   */
  enablesProtectedMode(failures: number): boolean {
    return failures >= LockoutRules.protectedMode.maxFailures;
  }

  /**
   * Tells whether the failures from an IP lock it.
   * @param failures Failures from the IP.
   * @returns `true` when locked.
   */
  locksIp(failures: number): boolean {
    return failures >= LockoutRules.ip.maxFailures;
  }
}
