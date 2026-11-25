/**
 * Namespaces of the Valkey keys identity uses. They go after the service prefix
 * (`VALKEY_KEY_PREFIX`) that `ValkeyKeyspace` adds; the shared state `auth:*` is not here.
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
