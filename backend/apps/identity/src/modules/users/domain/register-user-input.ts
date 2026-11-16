/** Datos con los que `UsersFacade.register` crea un usuario y su credencial inicial. */
export interface RegisterUserInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly locale: string;
  /** Tenant de origen: el tenant compartido de la región o el que invita. */
  readonly homeTenantId: string;
}
