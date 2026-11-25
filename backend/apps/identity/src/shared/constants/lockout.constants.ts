const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/**
 * Lockout rules for failed attempts: exponential lockout per origin (account and IP or device), protected
 * mode per account, IP lockout and the second-factor lockout per user.
 */
export const LockoutRules = {
  origin: {
    /** Failures of an account from one origin that trigger the lockout. */
    maxFailures: 5,
    windowMs: 15 * MINUTE_MS,
    /** First wait; each new lockout doubles it (15, 30, 60 min). */
    baseLockMs: 15 * MINUTE_MS,
    /** Cap of the wait: 24 h. */
    maxLockMs: 24 * HOUR_MS,
  },
  /**
   * Life of the unlock epoch since the last lockout written with it. If it expired before a lockout, the
   * account would go back to epoch 0 and that lockout would no longer be seen; that is why it doubles the cap.
   */
  unlockEpochTtlMs: 48 * HOUR_MS,
  protectedMode: {
    /** Failures of an account from several origins that trigger protected mode. */
    maxFailures: 20,
    windowMs: HOUR_MS,
  },
  ip: {
    /** Failures of an IP over any account that lock the IP. */
    maxFailures: 50,
    windowMs: 15 * MINUTE_MS,
    lockMs: 15 * MINUTE_MS,
  },
  mfa: {
    /**
     * Wrong second-factor codes of a user, across every challenge and session, before verification stops
     * until the window slides: a six-digit code then needs years of guessing, not hours.
     */
    maxFailures: 10,
    windowMs: 15 * MINUTE_MS,
  },
} as const;
