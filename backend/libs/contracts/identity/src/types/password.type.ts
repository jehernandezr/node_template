/**
 * Password change from an open session. The policy for the new password
 * is applied by the server, so the contract only bounds the length.
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Request for an email to reset the password. */
export interface PasswordResetRequest {
  email: string;
}

/** Reset with the token from the email and the new password. */
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}
