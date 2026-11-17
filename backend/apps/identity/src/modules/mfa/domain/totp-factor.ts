/** El TOTP de un usuario: secreto cifrado y si ya lo confirmó. */
export interface TotpFactor {
  readonly userId: string;
  readonly encryptedSecret: string;
  readonly confirmedAt?: Date;
  /** Último paso de 30 s aceptado: un código no se usa dos veces. */
  readonly lastUsedStep: number;
  readonly version?: number;
}
