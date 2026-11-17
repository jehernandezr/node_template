/** Estado de una recuperación de contraseña, tal como se guarda. */
export interface PasswordResetState {
  readonly id: string;
  readonly userId: string;
  /** Huella del secreto del token; el secreto nunca se guarda. */
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly usedAt?: Date;
  readonly version?: number;
}

/** Una recuperación de contraseña: un token de un solo uso que vence. */
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
   * Marca la recuperación como usada si todavía sirve. `secretMatches` compara el secreto presentado con la
   * huella en tiempo constante. Devuelve `false`, sin cambiar nada, si ya se usó, venció o el secreto no
   * coincide: las tres responden igual para no revelar cuál fue.
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
