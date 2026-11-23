import { UserStatus } from '@contracts/identity';

/** Estado completo de un usuario, tal como se guarda. */
export interface UserState {
  readonly id: string;
  readonly homeTenantId: string;
  /** Email normalizado. */
  readonly email: string;
  readonly emailFingerprint: Buffer;
  readonly emailVerifiedAt?: Date;
  readonly status: UserStatus;
  readonly displayName: string;
  readonly locale: string;
  readonly lastTenantId?: string;
  readonly version?: number;
}

/** Un usuario de la plataforma. Vive en el shard de su tenant de origen. */
export class User {
  private static readonly ERASED_EMAIL_DOMAIN = '@erased.invalid';
  private static readonly ERASED_NAME = '-';

  private constructor(private state: UserState) {}

  /** Usuario recién registrado: espera la verificación de su email. */
  static register(
    state: Omit<UserState, 'status' | 'emailVerifiedAt' | 'version'>,
  ): User {
    return new User({ ...state, status: UserStatus.PendingVerification });
  }

  static rehydrate(state: UserState): User {
    return new User(state);
  }

  get id(): string {
    return this.state.id;
  }

  snapshot(): UserState {
    return this.state;
  }

  /** Verifica el email y activa la cuenta si esperaba la verificación. Devuelve `false` si ya estaba verificado. */
  verifyEmail(now: Date): boolean {
    if (this.state.emailVerifiedAt !== undefined) {
      return false;
    }
    this.state = {
      ...this.state,
      emailVerifiedAt: now,
      status:
        this.state.status === UserStatus.PendingVerification
          ? UserStatus.Active
          : this.state.status,
    };
    return true;
  }

  /** Devuelve `false` si ya estaba suspendido: la operación es idempotente. */
  suspend(): boolean {
    if (this.state.status === UserStatus.Suspended) {
      return false;
    }
    this.state = { ...this.state, status: UserStatus.Suspended };
    return true;
  }

  /** Vuelve a activo, o a pendiente si nunca verificó el email. Devuelve `false` si no estaba suspendido. */
  reactivate(): boolean {
    if (this.state.status !== UserStatus.Suspended) {
      return false;
    }
    this.state = {
      ...this.state,
      status:
        this.state.emailVerifiedAt === undefined
          ? UserStatus.PendingVerification
          : UserStatus.Active,
    };
    return true;
  }

  updateProfile(changes: { displayName?: string; locale?: string }): void {
    this.state = {
      ...this.state,
      ...(changes.displayName === undefined
        ? {}
        : { displayName: changes.displayName }),
      ...(changes.locale === undefined ? {} : { locale: changes.locale }),
    };
  }

  /** El email nuevo llega ya verificado: el usuario confirmó con el token que se le envió. */
  changeEmail(email: string, fingerprint: Buffer, now: Date): void {
    this.state = {
      ...this.state,
      email,
      emailFingerprint: fingerprint,
      emailVerifiedAt: now,
    };
  }

  setLastTenant(tenantId: string): void {
    this.state = { ...this.state, lastTenantId: tenantId };
  }

  /**
   * Borra los datos personales: queda una fila `Deleted` sin email ni nombre reales, para que lo que la
   * referencia en otros tenants no apunte a la nada. Devuelve `false` si ya estaba borrado.
   */
  erase(): boolean {
    if (this.state.status === UserStatus.Deleted) {
      return false;
    }
    this.state = {
      id: this.state.id,
      homeTenantId: this.state.homeTenantId,
      email: `${this.state.id}${User.ERASED_EMAIL_DOMAIN}`,
      emailFingerprint: Buffer.from(this.state.id),
      status: UserStatus.Deleted,
      displayName: User.ERASED_NAME,
      locale: this.state.locale,
      ...(this.state.version === undefined
        ? {}
        : { version: this.state.version }),
    };
    return true;
  }
}
