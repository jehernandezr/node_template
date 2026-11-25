/** A user's TOTP: encrypted secret and whether it has been confirmed. */
export interface TotpFactor {
  readonly userId: string;
  readonly encryptedSecret: string;
  readonly confirmedAt?: Date;
  /** Last accepted 30 s step: a code is not used twice. */
  readonly lastUsedStep: number;
  readonly version?: number;
}
