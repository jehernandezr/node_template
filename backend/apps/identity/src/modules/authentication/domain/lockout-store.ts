/**
 * State of the sign-in lockouts: level and end of each origin's lockout, IP lockout and protected
 * mode of each account. Failures are counted by `AttemptCounters`.
 */
export abstract class LockoutStore {
  /**
   * Milliseconds left of the origin or IP lockout, whichever is greater; `undefined` without a lockout.
   * @param origin Origin key.
   * @param ip IP of the attempt.
   * @returns The remaining milliseconds, or `undefined`.
   */
  abstract remainingLockMs(
    origin: string,
    ip: string,
  ): Promise<number | undefined>;

  /**
   * Tells whether the account is in protected mode.
   * @param account Account key.
   * @returns `true` when protected.
   */
  abstract isProtected(account: string): Promise<boolean>;

  /**
   * Raises the origin's lockout level and returns the new one, starting at 1. The level is forgotten after `ttlMs`.
   * @param origin Origin key.
   * @param ttlMs How long the level is remembered.
   * @returns The new level.
   */
  abstract raiseLevel(origin: string, ttlMs: number): Promise<number>;

  /**
   * Blocks sign-in attempts from an origin for a while.
   * @param origin Origin key.
   * @param lockMs Lock duration.
   */
  abstract lockOrigin(origin: string, lockMs: number): Promise<void>;

  /**
   * Blocks sign-in attempts from an IP for a while.
   * @param ip Locked IP.
   * @param lockMs Lock duration.
   */
  abstract lockIp(ip: string, lockMs: number): Promise<void>;

  /**
   * Turns on the account's protected mode. `true` if it was not active.
   * @param account Account key.
   * @param ttlMs Duration of protected mode.
   * @returns Whether it turned on now.
   */
  abstract protect(account: string, ttlMs: number): Promise<boolean>;

  /**
   * The account's unlock epoch. It is part of each origin's key, so bumping it leaves behind
   * the lockouts and counters of all its origins without having to find them.
   * @param account Account key.
   * @returns The epoch.
   */
  abstract unlockEpoch(account: string): Promise<number>;

  /**
   * Bumps the unlock epoch, which lives `ttlMs` from now, and removes protected mode.
   * @param account Account key.
   * @param ttlMs Lifetime of the new epoch.
   */
  abstract unlock(account: string, ttlMs: number): Promise<void>;

  /**
   * Extends the current epoch so it lives `ttlMs` longer: lockouts just written with it remain visible.
   * @param account Account key.
   * @param ttlMs Extra lifetime.
   */
  abstract retainEpoch(account: string, ttlMs: number): Promise<void>;
}
