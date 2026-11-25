/** Newly opened session with its tokens. The web channel carries `sessionToken` in the cookie. */
export interface IssuedSession {
  readonly sessionId: string;
  readonly accessToken: string;
  readonly accessExpiresAt: Date;
  /** Opaque token `st1_...` of this generation. */
  readonly sessionToken: string;
  readonly sessionExpiresAt: Date;
}
