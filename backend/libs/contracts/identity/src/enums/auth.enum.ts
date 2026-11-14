/** Métodos de segundo factor que el servidor puede ofrecer. */
export enum MfaFactor {
  DeviceOtp = 'device_otp',
  EmailOtp = 'email_otp',
  Totp = 'totp',
  RecoveryCode = 'recovery_code',
  Passkey = 'passkey',
}

/** Resultado de un inicio de sesión o de una verificación MFA. */
export enum SignInStatus {
  /** Hay tokens: la sesión quedó creada. */
  Authenticated = 'authenticated',
  /** Falta un segundo factor antes de emitir tokens. */
  MfaRequired = 'mfa_required',
}

/** Plataforma del cliente de una sesión o dispositivo. */
export enum ClientPlatform {
  Ios = 'ios',
  Android = 'android',
  Web = 'web',
  Macos = 'macos',
  Windows = 'windows',
  Linux = 'linux',
}

/** Motivo de la revocación de una sesión. */
export enum RevocationReason {
  Logout = 'logout',
  UserAction = 'user_action',
  PasswordChanged = 'password_changed',
  AdminAction = 'admin_action',
  Compromised = 'compromised',
}

/** Alcance de una revocación de tokens. */
export enum RevocationScope {
  Session = 'session',
  User = 'user',
  Tenant = 'tenant',
}
