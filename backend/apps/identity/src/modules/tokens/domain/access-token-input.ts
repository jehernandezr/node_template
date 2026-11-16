import type { AuthMethodReference } from '@contracts/identity';

/** Lo que `TokensFacade.issue` firma. Los roles, los roles de plataforma y el `pv` los calcula `tokens` con `AccessFacade`. */
export interface AccessTokenInput {
  readonly userId: string;
  readonly tenantId: string;
  readonly homeTenantId: string;
  readonly sessionId: string;
  readonly deviceId?: string;
  readonly authMethods: readonly AuthMethodReference[];
  readonly authTime: Date;
  /** Tope absoluto de la sesión (claim `sxp`). */
  readonly sessionExpiresAt: Date;
}
