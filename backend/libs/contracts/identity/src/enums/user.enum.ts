/** Status of a user's account. */
export enum UserStatus {
  PendingVerification = 'pending_verification',
  Active = 'active',
  Suspended = 'suspended',
  Deleted = 'deleted',
}

/** Security alerts identity raises on an account. */
export enum SecurityAlertType {
  NewDeviceSignIn = 'new_device_sign_in',
  VerifierRegistered = 'verifier_registered',
  PasswordChanged = 'password_changed',
  PasswordRecovered = 'password_recovered',
  MfaRecoveryStarted = 'mfa_recovery_started',
  MfaRecoveryCompleted = 'mfa_recovery_completed',
  EmailChanged = 'email_changed',
  MfaFactorRemoved = 'mfa_factor_removed',
  RecoveryCodeUsed = 'recovery_code_used',
  ApiKeyCreated = 'api_key_created',
  ApiKeyRevoked = 'api_key_revoked',
  AccountLocked = 'account_locked',
  ProtectedModeEnabled = 'protected_mode_enabled',
  DeviceApprovalDenied = 'device_approval_denied',
}
