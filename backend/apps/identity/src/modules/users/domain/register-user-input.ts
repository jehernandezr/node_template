/** Data with which `UsersFacade.register` creates a user and their initial credential. */
export interface RegisterUserInput {
  readonly email: string;
  readonly password: string;
  readonly displayName: string;
  readonly locale: string;
  /** Home tenant: the region's shared tenant or the inviting one. */
  readonly homeTenantId: string;
  /** Instant the email was proved, for an account created outside the public sign-up; unverified when absent. */
  readonly emailVerifiedAt?: Date;
}
