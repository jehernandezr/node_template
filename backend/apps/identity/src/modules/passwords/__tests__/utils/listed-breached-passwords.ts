import { BreachedPasswordList } from '../../domain/breached-password-list.js';

/** Breached password list with the passwords the test gives it. */
export class ListedBreachedPasswords extends BreachedPasswordList {
  private readonly listed: ReadonlySet<string>;

  constructor(...passwords: readonly string[]) {
    super();
    this.listed = new Set(passwords);
  }

  override async contains(password: string): Promise<boolean> {
    return this.listed.has(password);
  }
}
