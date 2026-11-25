/** What a route does with the web channel session cookie. */
export enum SessionCookieMode {
  /** Does not touch the cookie. */
  None = 'none',
  /** Responds with the new cookie built from the `sessionToken` the use case returned. */
  Issue = 'issue',
  /** Same as `Issue`, but if the response has no `sessionToken` it leaves the cookie as it is. It also reads the cookie as input. */
  Rotate = 'rotate',
  /** Clears the cookie and reads the cookie as input. */
  Clear = 'clear',
}
