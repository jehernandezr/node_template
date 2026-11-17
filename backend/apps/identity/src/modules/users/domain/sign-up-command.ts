/** Registro desde la ruta pública, con el cliente que lo pide. */
export interface SignUpCommand {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly locale: string;
  readonly invitationToken?: string;
}
