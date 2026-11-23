/** Usuario de una conexión de tiempo real y el tenant de su token. `sessionExpiresAt` es epoch en segundos. */
export interface StreamPrincipal {
  readonly userId: string;
  readonly tenantId: string;
  readonly homeTenantId: string;
  readonly sessionId: string;
  readonly sessionExpiresAt: number;
}
