/**
 * State of the sign-in lockouts: level and end of each origin's lockout, IP lockout and protected
 * mode of each account. Failures are counted by `AttemptCounters`.
 */
export abstract class LockoutStore {
  /** Milliseconds left of the origin or IP lockout, whichever is greater; `undefined` without a lockout. */
  abstract remainingLockMs(
    origin: string,
    ip: string,
  ): Promise<number | undefined>;

  abstract isProtected(account: string): Promise<boolean>;

  /** Raises the origin's lockout level and returns the new one, starting at 1. The level is forgotten after `ttlMs`. */
  abstract raiseLevel(origin: string, ttlMs: number): Promise<number>;

  abstract lockOrigin(origin: string, lockMs: number): Promise<void>;

  abstract lockIp(ip: string, lockMs: number): Promise<void>;

  /** Turns on the account's protected mode. `true` if it was not active. */
  abstract protect(account: string, ttlMs: number): Promise<boolean>;

  /**
   * The account's unlock epoch. It is part of each origin's key, so bumping it leaves behind
   * the lockouts and counters of all its origins without having to find them.
   */
  abstract unlockEpoch(account: string): Promise<number>;

  /** Bumps the unlock epoch, which lives `ttlMs` from now, and removes protected mode. */
  abstract unlock(account: string, ttlMs: number): Promise<void>;

  /** Extends the current epoch so it lives `ttlMs` longer: lockouts just written with it remain visible. */
  abstract retainEpoch(account: string, ttlMs: number): Promise<void>;
}
