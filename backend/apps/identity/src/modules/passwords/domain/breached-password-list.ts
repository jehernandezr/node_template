/** Passwords known from breaches: they are not accepted even if they meet the policy. */
export abstract class BreachedPasswordList {
  /**
   * Tells whether a password is in the breached list.
   * @param password Candidate password.
   * @returns `true` when breached.
   */
  abstract contains(password: string): Promise<boolean>;
}
