import { LockoutRules } from '../../../shared/constants/lockout.constants.js';

/**
 * Lockout rules for failed attempts: exponential backoff per origin (account and IP), protected mode per
 * account and IP lockout. It is pure computation over the counters.
 */
export class LockoutPolicy {
  /** Lockout number `level` (from 1) lasts 15, 30, 60 minutes... up to 24 hours. */
  originLockMs(level: number): number {
    return Math.min(
      LockoutRules.origin.baseLockMs * 2 ** Math.max(0, level - 1),
      LockoutRules.origin.maxLockMs,
    );
  }

  locksOrigin(failures: number): boolean {
    return failures >= LockoutRules.origin.maxFailures;
  }

  /** From the threshold on the account enters protected mode; the store reports it only the first time. */
  enablesProtectedMode(failures: number): boolean {
    return failures >= LockoutRules.protectedMode.maxFailures;
  }

  locksIp(failures: number): boolean {
    return failures >= LockoutRules.ip.maxFailures;
  }
}
