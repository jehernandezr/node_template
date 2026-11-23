/** Plantillas de correo transaccional de identity. */
export enum IdentityEmailTemplate {
  EmailVerification = 'email-verification',
  EmailAlreadyRegistered = 'email-already-registered',
  PasswordReset = 'password-reset',
  EmailChangeConfirmation = 'email-change-confirmation',
  MfaCode = 'mfa-code',
  MfaRecoveryLink = 'mfa-recovery-link',
  TenantInvitation = 'tenant-invitation',
}
