/**
 * Espacios de las llaves de Valkey que usa identity. Van después del prefijo del servicio
 * (`VALKEY_KEY_PREFIX`) que agrega `ValkeyKeyspace`; el estado compartido `auth:*` no está aquí.
 */
export enum IdentityCacheKey {
  EmailVerification = 'email-verification',
  PendingAuthentication = 'pending-authentication',
  MfaChallenge = 'mfa-challenge',
  MfaChallengeRate = 'mfa-challenge-rate',
  DeviceApproval = 'device-approval',
  DeviceNonce = 'device-nonce',
  WebAuthnChallenge = 'webauthn-challenge',
  LockoutOrigin = 'lockout-origin',
  LockoutProtected = 'lockout-protected',
  LockoutLevel = 'lockout-level',
  LockoutIp = 'lockout-ip',
  LockoutEpoch = 'lockout-epoch',
  ApiKeyUsage = 'api-key-usage',
  MfaRecovery = 'mfa-recovery',
  TotpEnrollment = 'totp-enrollment',
}
