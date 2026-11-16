/**
 * Cambio de contraseña de una sesión abierta. La política de la contraseña
 * nueva la aplica el servidor, así que el contrato solo acota el largo.
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Pedido de un correo para restablecer la contraseña. */
export interface PasswordResetRequest {
  email: string;
}

/** Restablecimiento con el token del correo y la contraseña nueva. */
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}
