/** Error codes owned by `@platform/auth`. The others it uses come from `PlatformErrorCode` and `IdentityErrorCode`. */
export enum AuthErrorCode {
  TokenExpired = 'PLATFORM.AUTH.TOKEN_EXPIRED',
  InvalidKey = 'PLATFORM.AUTH.INVALID_KEY',
  JwksUnavailable = 'PLATFORM.AUTH.JWKS_UNAVAILABLE',
}
