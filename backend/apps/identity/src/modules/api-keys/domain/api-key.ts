import { ApiKeyStatus, type ApiKeyEnvironment } from '@contracts/identity';

/** Full state of an API key, as stored. */
export interface ApiKeyState {
  readonly id: string;
  readonly tenantId: string;
  readonly serviceAccountId: string;
  readonly prefix: string;
  readonly secretHmac: string;
  readonly environment: ApiKeyEnvironment;
  readonly expiresAt?: Date;
  readonly allowedCidrs: readonly string[];
  readonly lastUsedAt?: Date;
  readonly status: ApiKeyStatus;
  /** Until when a rotated key remains valid. */
  readonly validUntil?: Date;
  readonly createdAt: Date;
  readonly version?: number;
}

/** An API key of a service account. Rotating it keeps the previous one valid for a grace period. */
export class ApiKey {
  private constructor(private state: ApiKeyState) {}

  /**
   * Issues an active key in version 1.
   * @param state Key data.
   * @returns The key.
   */
  static issue(state: Omit<ApiKeyState, 'status' | 'version'>): ApiKey {
    return new ApiKey({ ...state, status: ApiKeyStatus.Active });
  }

  /**
   * Rebuilds a key from its state.
   * @param state Stored key.
   * @returns The key.
   */
  static rehydrate(state: ApiKeyState): ApiKey {
    return new ApiKey(state);
  }

  /**
   * Copies the key state.
   * @returns The key state.
   */
  snapshot(): ApiKeyState {
    return this.state;
  }

  /**
   * Whether it is valid at time `now`: active or rotated within its grace period, and not expired.
   * @param now Instant to check.
   * @returns `true` when usable.
   */
  isUsable(now: Date): boolean {
    const ms = now.getTime();
    if (this.state.status === ApiKeyStatus.Revoked) {
      return false;
    }
    if (
      this.state.status === ApiKeyStatus.Rotated &&
      (this.state.validUntil === undefined ||
        this.state.validUntil.getTime() <= ms)
    ) {
      return false;
    }
    return !this.isExpired(now);
  }

  /**
   * Tells whether the key's validity ended.
   * @param now Instant to check.
   * @returns `true` when expired.
   */
  isExpired(now: Date): boolean {
    return (
      this.state.expiresAt !== undefined &&
      this.state.expiresAt.getTime() <= now.getTime()
    );
  }

  /**
   * Marks the key rotated; it stays valid until `validUntil`.
   * @param validUntil End of the grace period.
   */
  rotate(validUntil: Date): void {
    this.state = { ...this.state, status: ApiKeyStatus.Rotated, validUntil };
  }

  /**
   * Returns `false` if it was already revoked.
   * @returns Whether it changed.
   */
  revoke(): boolean {
    if (this.state.status === ApiKeyStatus.Revoked) {
      return false;
    }
    this.state = { ...this.state, status: ApiKeyStatus.Revoked };
    return true;
  }
}
