import type {
  AuthMethodReference,
  ClientPlatform,
  RevocationReason,
} from '@contracts/identity';

/** Full state of a session, as stored. */
export interface SessionState {
  readonly id: string;
  readonly userId: string;
  readonly homeTenantId: string;
  readonly activeTenantId: string;
  readonly deviceId?: string;
  readonly deviceName: string;
  readonly platform: ClientPlatform;
  /** Random salt of the session; with the service key it derives the secret of each generation. */
  readonly tokenSalt: string;
  readonly generation: number;
  readonly previousGenerationUntil?: Date;
  readonly amr: readonly AuthMethodReference[];
  readonly authTime: Date;
  readonly mfaVerifiedAt?: Date;
  readonly idleExpiresAt: Date;
  readonly absoluteExpiresAt: Date;
  readonly lastRefreshAt: Date;
  readonly ip: string;
  readonly userAgent?: string;
  readonly revokedAt?: Date;
  readonly revocationReason?: RevocationReason;
  readonly version?: number;
}

/** How a presented generation compares with the session's. */
export enum GenerationMatch {
  /** It is the current generation. */
  Current = 'current',
  /** It is the previous one and arrived within the grace period: two tabs refreshing at the same time. */
  Grace = 'grace',
  /** It is an already rotated generation with its real secret: someone is reusing a stolen token. */
  Reused = 'reused',
  /** The generation does not exist or its secret does not match: it proves nothing and does not revoke. */
  Unknown = 'unknown',
}

/** A session open on a device, with its session token that rotates on each refresh. */
export class Session {
  /** Generation of a session's first session token. */
  static readonly FIRST_GENERATION = 1;

  private constructor(private state: SessionState) {}

  /**
   * Starts a session at its first generation, with the expiries and methods of the sign-in that opened it.
   * @param state Session data.
   * @returns The session.
   */
  static open(state: SessionState): Session {
    return new Session(state);
  }

  /**
   * Rebuilds a session from its state.
   * @param state Stored session.
   * @returns The session.
   */
  static rehydrate(state: SessionState): Session {
    return new Session(state);
  }

  /** UUIDv7 that identifies the session; the session token carries it. */
  get id(): string {
    return this.state.id;
  }

  /**
   * Copies the session state.
   * @returns The session state.
   */
  snapshot(): SessionState {
    return this.state;
  }

  /**
   * Tells whether the session was revoked.
   * @returns `true` when revoked.
   */
  isRevoked(): boolean {
    return this.state.revokedAt !== undefined;
  }

  /**
   * Tells whether the session's inactivity or absolute cap passed.
   * @param now Instant to check.
   * @returns `true` when expired.
   */
  isExpired(now: Date): boolean {
    return (
      now.getTime() >= this.state.idleExpiresAt.getTime() ||
      now.getTime() >= this.state.absoluteExpiresAt.getTime()
    );
  }

  /**
   * Compares the presented generation with the session. `secretMatches` recomputes the secret of that generation and
   * compares it in constant time; the session does not know it. Only a real secret counts as reuse: the
   * token's route comes from the claims of any access token, so an old generation with a forged
   * secret must not be able to revoke someone else's session.
   * @param generation Presented generation.
   * @param secretMatches Checks the secret of a generation.
   * @param now Current instant.
   * @returns Whether it is the current generation, the previous one in grace, or theft.
   */
  classify(
    generation: number,
    secretMatches: (generation: number) => boolean,
    now: Date,
  ): GenerationMatch {
    if (
      generation < Session.FIRST_GENERATION ||
      generation > this.state.generation ||
      !secretMatches(generation)
    ) {
      return GenerationMatch.Unknown;
    }
    if (generation === this.state.generation) {
      return GenerationMatch.Current;
    }
    const graceUntil = this.state.previousGenerationUntil;
    return generation === this.state.generation - 1 &&
      graceUntil !== undefined &&
      now.getTime() < graceUntil.getTime()
      ? GenerationMatch.Grace
      : GenerationMatch.Reused;
  }

  /**
   * Bumps the generation, opens the grace period of the previous one and extends inactivity without exceeding the absolute cap.
   * @param now Instant of the rotation.
   * @param graceMs Grace of the previous generation.
   * @param idleMs Inactivity lifetime.
   */
  rotate(now: Date, graceMs: number, idleMs: number): void {
    this.state = {
      ...this.state,
      previousGenerationUntil: new Date(now.getTime() + graceMs),
      generation: this.state.generation + 1,
      lastRefreshAt: now,
      idleExpiresAt: new Date(
        Math.min(
          now.getTime() + idleMs,
          this.state.absoluteExpiresAt.getTime(),
        ),
      ),
    };
  }

  /**
   * Revokes the session.
   * @param reason Why it is revoked.
   * @param now Instant of the revocation.
   * @returns Whether it was still active.
   */
  revoke(reason: RevocationReason, now: Date): boolean {
    if (this.isRevoked()) {
      return false;
    }
    this.state = { ...this.state, revokedAt: now, revocationReason: reason };
    return true;
  }

  /**
   * Records a verified second factor and the methods used.
   * @param at Instant of the verification.
   * @param amr Methods used.
   */
  markMfaVerified(at: Date, amr: readonly AuthMethodReference[]): void {
    this.state = {
      ...this.state,
      mfaVerifiedAt: at,
      authTime: at,
      amr: [...new Set([...this.state.amr, ...amr])],
    };
  }

  /**
   * Changes the active tenant of the session.
   * @param tenantId New active tenant.
   */
  switchTenant(tenantId: string): void {
    this.state = { ...this.state, activeTenantId: tenantId };
  }
}
