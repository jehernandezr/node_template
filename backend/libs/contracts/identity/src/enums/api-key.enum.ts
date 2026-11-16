/** Entorno de una API key: el prefijo `sk_live_` o `sk_test_`. */
export enum ApiKeyEnvironment {
  Live = 'live',
  Test = 'test',
}

/** Estado de una API key. `rotated` sigue válida hasta su `validUntil`. */
export enum ApiKeyStatus {
  Active = 'active',
  Rotated = 'rotated',
  Revoked = 'revoked',
}

/** Estado de una service account. */
export enum ServiceAccountStatus {
  Active = 'active',
  Disabled = 'disabled',
}
