import type { UserStatus } from '@contracts/identity';

/** Vista de solo lectura de un usuario para los otros módulos. */
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
