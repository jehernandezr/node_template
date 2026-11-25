import { UserStatus } from '@contracts/identity';

/** Full state of a user, as it is stored. */
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

/** A platform user. Lives in the shard of their home tenant. */
export class User {
  private static readonly ERASED_EMAIL_DOMAIN = '@erased.invalid';
  private static readonly ERASED_NAME = '-';

  private constructor(private state: UserState) {}

  /** Newly registered user: waits for their email verification. */
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

  /** Verifies the email and activates the account if it was waiting for verification. Returns `false` if it was already verified. */
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

  /** Returns `false` if it was already suspended: the operation is idempotent. */
  suspend(): boolean {
    if (this.state.status === UserStatus.Suspended) {
      return false;
    }
    this.state = { ...this.state, status: UserStatus.Suspended };
    return true;
  }

  /** Returns to active, or to pending if the email was never verified. Returns `false` if it was not suspended. */
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

  /** The new email arrives already verified: the user confirmed with the token sent to them. */
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
   * Deletes the personal data: a `Deleted` row remains without real email or name, so that what
   * references it in other tenants does not point to nothing. Returns `false` if it was already deleted.
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
