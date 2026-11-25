/** Rate limit tier of a route. `RateLimitTierRules` translates each one into a rule. */
export enum RateLimitTier {
  /** Credential and recovery routes, counted by IP. */
  Auth = 'auth',
  /** Sensitive operations of an authenticated user. */
  Sensitive = 'sensitive',
  /** Normal API traffic. */
  Standard = 'standard',
  /** Service-to-service traffic. */
  Internal = 'internal',
}
