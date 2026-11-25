/** Second factor methods the server can offer. */
export enum MfaFactor {
  DeviceOtp = 'device_otp',
  EmailOtp = 'email_otp',
  Totp = 'totp',
  RecoveryCode = 'recovery_code',
  Passkey = 'passkey',
}

/** Result of a sign-in or an MFA verification. */
export enum SignInStatus {
  /** There are tokens: the session was created. */
  Authenticated = 'authenticated',
  /** A second factor is missing before issuing tokens. */
  MfaRequired = 'mfa_required',
}

/** Client platform of a session or device. */
export enum ClientPlatform {
  Ios = 'ios',
  Android = 'android',
  Web = 'web',
  Macos = 'macos',
  Windows = 'windows',
  Linux = 'linux',
}

/** Reason for revoking a session. */
export enum RevocationReason {
  Logout = 'logout',
  UserAction = 'user_action',
  PasswordChanged = 'password_changed',
  AdminAction = 'admin_action',
  Compromised = 'compromised',
}

/** Scope of a token revocation. */
export enum RevocationScope {
  Session = 'session',
  User = 'user',
  Tenant = 'tenant',
}

/** Methods a session was authenticated with (`amr` claim of the access token). */
export enum AuthMethodReference {
  Password = 'pwd',
  Passkey = 'passkey',
  Device = 'device',
  EmailOtp = 'email_otp',
  Totp = 'totp',
  RecoveryCode = 'recovery_code',
}

/** Recipient of an access token: values of the `aud` claim. */
export enum TokenAudience {
  Api = 'api',
  Backoffice = 'backoffice',
}
