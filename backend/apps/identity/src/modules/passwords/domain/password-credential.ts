/** La contraseña de un usuario: su hash PHC y cuándo cambió. */
export interface PasswordCredential {
  readonly userId: string;
  readonly hash: string;
  readonly changedAt: Date;
  readonly version?: number;
}
