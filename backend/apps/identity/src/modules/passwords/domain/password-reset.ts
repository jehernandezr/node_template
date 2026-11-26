/** State of a password recovery, as stored. */
export interface PasswordResetState {
  readonly id: string;
  readonly userId: string;
  /** Hash of the token's secret; the secret is never stored. */
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly usedAt?: Date;
  readonly version?: number;
}

/** A password recovery: a single-use token that expires. */
export class PasswordReset {
  private constructor(private state: PasswordResetState) {}

  /**
   * Issues an unused reset in version 1.
   * @param state Reset data.
   * @returns The reset.
   */
  static issue(
    state: Omit<PasswordResetState, 'usedAt' | 'version'>,
  ): PasswordReset {
    return new PasswordReset(state);
  }

  /**
   * Rebuilds a reset from its state.
   * @param state Stored reset.
   * @returns The reset.
   */
  static rehydrate(state: PasswordResetState): PasswordReset {
    return new PasswordReset(state);
  }

  /** UUIDv7 that identifies the reset request; the emailed token carries it. */
  get id(): string {
    return this.state.id;
  }

  /**
   * Copies the reset state.
   * @returns The reset state.
   */
  snapshot(): PasswordResetState {
    return this.state;
  }

  /**
   * Marks the recovery as used if it is still valid. `secretMatches` compares the presented secret with the
   * hash in constant time. Returns `false`, without changing anything, if it was already used, expired or the secret does not
   * match: all three respond the same so as not to reveal which one it was.
   * @param secretMatches Constant-time comparison with the stored hash.
   * @param now Current instant.
   * @returns Whether it was redeemed now.
   */
  redeem(secretMatches: (tokenHash: string) => boolean, now: Date): boolean {
    if (
      this.state.usedAt !== undefined ||
      now.getTime() >= this.state.expiresAt.getTime() ||
      !secretMatches(this.state.tokenHash)
    ) {
      return false;
    }
    this.state = { ...this.state, usedAt: now };
    return true;
  }
}
