/** What a verification or email change token stores while it waits for confirmation. */
export interface PendingEmailProof {
  readonly userId: string;
  readonly homeTenantId: string;
  /** The email the token proves, already normalized. */
  readonly email: string;
}
