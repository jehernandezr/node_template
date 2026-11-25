/** A user's password: its PHC hash and when it changed. */
export interface PasswordCredential {
  readonly userId: string;
  readonly hash: string;
  readonly changedAt: Date;
  readonly version?: number;
}
