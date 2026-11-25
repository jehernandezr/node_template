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

  static issue(
    state: Omit<PasswordResetState, 'usedAt' | 'version'>,
  ): PasswordReset {
    return new PasswordReset(state);
  }

  static rehydrate(state: PasswordResetState): PasswordReset {
    return new PasswordReset(state);
  }

  get id(): string {
    return this.state.id;
  }

  snapshot(): PasswordResetState {
    return this.state;
  }

  /**
   * Marks the recovery as used if it is still valid. `secretMatches` compares the presented secret with the
   * hash in constant time. Returns `false`, without changing anything, if it was already used, expired or the secret does not
   * match: all three respond the same so as not to reveal which one it was.
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
