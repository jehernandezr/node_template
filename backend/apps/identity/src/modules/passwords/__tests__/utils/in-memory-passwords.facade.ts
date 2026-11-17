import { constantTimeEquals } from '../../../../shared/utils/constant-time.js';
import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { PasswordsFacade } from '../../application/passwords.facade.js';

/** Contraseñas en memoria, en claro: solo para pruebas. */
export class InMemoryPasswordsFacade extends PasswordsFacade {
  /** Cuántas veces se verificó sin usuario, para comprobar que se compara igual. */
  unknownUserChecks = 0;
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

  /** Acepta todo salvo las contraseñas de la lista `rejected`. */
  readonly rejected = new Set<string>();

  async assertAcceptable(password: string): Promise<void> {
    if (this.rejected.has(password)) {
      throw new Error('Password rejected');
    }
  }
}
