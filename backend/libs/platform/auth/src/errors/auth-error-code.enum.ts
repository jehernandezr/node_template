/** Códigos de error propios de `@platform/auth`. Los demás que usa vienen de `PlatformErrorCode` y `IdentityErrorCode`. */
export enum AuthErrorCode {
  TokenExpired = 'PLATFORM.AUTH.TOKEN_EXPIRED',
  InvalidKey = 'PLATFORM.AUTH.INVALID_KEY',
  JwksUnavailable = 'PLATFORM.AUTH.JWKS_UNAVAILABLE',
}
