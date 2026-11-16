/** Una sesión y el usuario que la tiene: con esto se llega a su fila. */
export interface SessionRef {
  readonly sessionId: string;
  readonly userId: string;
  readonly homeTenantId: string;
}
