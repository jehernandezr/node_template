/** Lo que guarda un token de verificación o de cambio de email mientras espera la confirmación. */
export interface PendingEmailProof {
  readonly userId: string;
  readonly homeTenantId: string;
  /** El email que el token prueba, ya normalizado. */
  readonly email: string;
}
