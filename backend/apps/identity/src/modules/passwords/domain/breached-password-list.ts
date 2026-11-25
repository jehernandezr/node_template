/** Passwords known from breaches: they are not accepted even if they meet the policy. */
export abstract class BreachedPasswordList {
  abstract contains(password: string): Promise<boolean>;
}
