import type {
  AuthMethodReference,
  ClientPlatform,
  RevocationReason,
} from '@contracts/identity';

/** Estado completo de una sesión, tal como se guarda. */
export interface SessionState {
  readonly id: string;
  readonly userId: string;
  readonly homeTenantId: string;
  readonly activeTenantId: string;
  readonly deviceId?: string;
  readonly deviceName: string;
  readonly platform: ClientPlatform;
  /** Sal aleatoria de la sesión; con la llave del servicio deriva el secreto de cada generación. */
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

/** Cómo se compara una generación presentada con la de la sesión. */
export enum GenerationMatch {
  /** Es la generación vigente. */
  Current = 'current',
  /** Es la anterior y llegó dentro de la gracia: dos pestañas que refrescan a la vez. */
  Grace = 'grace',
  /** Es una generación ya rotada con su secreto verdadero: alguien reusa un token robado. */
  Reused = 'reused',
  /** La generación no existe o su secreto no coincide: no prueba nada y no revoca. */
  Unknown = 'unknown',
}

/** Una sesión abierta en un dispositivo, con su session token que rota en cada refresh. */
export class Session {
  /** Generación del primer session token de una sesión. */
  static readonly FIRST_GENERATION = 1;

  private constructor(private state: SessionState) {}

  static open(state: SessionState): Session {
    return new Session(state);
  }

  static rehydrate(state: SessionState): Session {
    return new Session(state);
  }

  get id(): string {
    return this.state.id;
  }

  snapshot(): SessionState {
    return this.state;
  }

  isRevoked(): boolean {
    return this.state.revokedAt !== undefined;
  }

  isExpired(now: Date): boolean {
    return (
      now.getTime() >= this.state.idleExpiresAt.getTime() ||
      now.getTime() >= this.state.absoluteExpiresAt.getTime()
    );
  }

  /**
   * Compara la generación presentada con la sesión. `secretMatches` recalcula el secreto de esa generación y
   * lo compara en tiempo constante; la sesión no lo conoce. Solo un secreto verdadero cuenta como reuso: la
   * ruta del token sale de los claims de cualquier access token, así que una generación vieja con un secreto
   * inventado no debe poder revocar la sesión de otro.
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
   * Sube la generación, abre la gracia de la anterior y extiende la inactividad sin pasar del tope absoluto.
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

  revoke(reason: RevocationReason, now: Date): boolean {
    if (this.isRevoked()) {
      return false;
    }
    this.state = { ...this.state, revokedAt: now, revocationReason: reason };
    return true;
  }

  markMfaVerified(at: Date, amr: readonly AuthMethodReference[]): void {
    this.state = {
      ...this.state,
      mfaVerifiedAt: at,
      authTime: at,
      amr: [...new Set([...this.state.amr, ...amr])],
    };
  }

  switchTenant(tenantId: string): void {
    this.state = { ...this.state, activeTenantId: tenantId };
  }
}
