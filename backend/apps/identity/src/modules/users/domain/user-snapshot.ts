import type { UserStatus } from '@contracts/identity';

/** Read-only view of a user for the other modules. */
export interface UserSnapshot {
  readonly id: string;
  readonly homeTenantId: string;
  /** Email normalizado. */
  readonly email: string;
  readonly emailVerifiedAt?: Date;
  readonly status: UserStatus;
  readonly displayName: string;
  readonly locale: string;
  readonly lastTenantId?: string;
}
