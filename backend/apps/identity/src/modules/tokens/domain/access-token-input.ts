import type { AuthMethodReference } from '@contracts/identity';

/** What `TokensFacade.issue` signs. The roles, the platform roles and the `pv` are computed by `tokens` with `AccessFacade`. */
export interface AccessTokenInput {
  readonly userId: string;
  readonly tenantId: string;
  readonly homeTenantId: string;
  readonly sessionId: string;
  readonly deviceId?: string;
  readonly authMethods: readonly AuthMethodReference[];
  readonly authTime: Date;
  /** Absolute cap of the session (claim `sxp`). */
  readonly sessionExpiresAt: Date;
}
