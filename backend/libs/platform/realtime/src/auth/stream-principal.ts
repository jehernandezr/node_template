/** User of a realtime connection and the tenant of their token. `sessionExpiresAt` is epoch in seconds. */
export interface StreamPrincipal {
  readonly userId: string;
  readonly tenantId: string;
  readonly homeTenantId: string;
  readonly sessionId: string;
  readonly sessionExpiresAt: number;
}
