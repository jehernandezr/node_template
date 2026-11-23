import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { PasskeysFacade } from '../../application/passkeys.facade.js';

/** Passkeys en memoria: solo recuerda qué usuarios tienen alguna. */
export class InMemoryPasskeysFacade extends PasskeysFacade {
  private readonly owners = new Set<string>();

  withPasskey(userId: string): this {
    this.owners.add(userId);
    return this;
  }

  async hasPasskeys(user: UserRef): Promise<boolean> {
    return this.owners.has(user.userId);
  }

  async forget(user: UserRef): Promise<void> {
    this.owners.delete(user.userId);
  }
}
