/** A session and the user that owns it: this is enough to reach its row. */
export interface SessionRef {
  readonly sessionId: string;
  readonly userId: string;
  readonly homeTenantId: string;
}
