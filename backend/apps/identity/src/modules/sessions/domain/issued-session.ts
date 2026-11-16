/** Sesión recién abierta con sus tokens. El canal web lleva `sessionToken` en la cookie. */
export interface IssuedSession {
  readonly sessionId: string;
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  /** Token opaco `st1_...` de esta generación. */
  readonly sessionToken: string;
  readonly sessionExpiresAt: Date;
}
