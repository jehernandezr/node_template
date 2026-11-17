import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { RegisterUserInput } from '../domain/register-user-input.js';
import type { UserSnapshot } from '../domain/user-snapshot.js';

/** Lo que `users` ofrece a los otros módulos. */
export abstract class UsersFacade {
  /** Busca por email en el catálogo. `undefined` si no existe. */
  abstract findByEmail(email: string): Promise<UserSnapshot | undefined>;
  /** @throws DomainError `IDENTITY.USER.NOT_FOUND` si no existe. */
  abstract getByRef(ref: UserRef): Promise<UserSnapshot>;
  /** El tenant de origen del usuario desde el catálogo, o `undefined` si no existe. */
  abstract refOf(userId: string): Promise<UserRef | undefined>;
  abstract register(input: RegisterUserInput): Promise<UserRef>;
  abstract setLastTenant(ref: UserRef, tenantId: string): Promise<void>;
}
