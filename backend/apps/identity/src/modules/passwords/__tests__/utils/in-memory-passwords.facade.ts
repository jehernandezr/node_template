import { constantTimeEquals } from '../../../../shared/utils/constant-time.js';
import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { PasswordsFacade } from '../../application/passwords.facade.js';

/** Passwords in memory, in the clear: for tests only. */
export class InMemoryPasswordsFacade extends PasswordsFacade {
  /** How many times it verified without a user, to check that it compares all the same. */
  unknownUserChecks = 0;
  /** Accepts everything except the passwords in this list. */
  readonly rejected = new Set<string>();
  private readonly passwords = new Map<string, string>();

  async verify(ref: UserRef | undefined, password: string): Promise<boolean> {
    if (ref === undefined) {
      this.unknownUserChecks += 1;
      return false;
    }
    const stored = this.passwords.get(ref.userId);
    return stored !== undefined && constantTimeEquals(stored, password);
  }

  async setInitial(ref: UserRef, password: string): Promise<void> {
    this.passwords.set(ref.userId, password);
  }

  async assertAcceptable(password: string): Promise<void> {
    if (this.rejected.has(password)) {
      throw new Error('Password rejected');
    }
  }

  async forget(ref: UserRef): Promise<void> {
    this.passwords.delete(ref.userId);
  }
}
