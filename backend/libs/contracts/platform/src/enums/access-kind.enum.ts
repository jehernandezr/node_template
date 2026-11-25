/** Access requirement of a route. */
export enum AccessKind {
  /** No session, for example sign-in. */
  Public = 'public',
  /** Requires a valid access token. */
  Authenticated = 'authenticated',
}
