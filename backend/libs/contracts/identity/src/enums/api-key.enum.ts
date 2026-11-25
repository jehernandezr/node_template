/** Environment of an API key: the `sk_live_` or `sk_test_` prefix. */
export enum ApiKeyEnvironment {
  Live = 'live',
  Test = 'test',
}

/** Status of an API key. `rotated` remains valid until its `validUntil`. */
export enum ApiKeyStatus {
  Active = 'active',
  Rotated = 'rotated',
  Revoked = 'revoked',
}

/** Status of a service account. */
export enum ServiceAccountStatus {
  Active = 'active',
  Disabled = 'disabled',
}
