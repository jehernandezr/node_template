import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { RegisterUserInput } from '../domain/register-user-input.js';
import type { UserSnapshot } from '../domain/user-snapshot.js';

/** Looks users up and registers them, and records their last and home tenant for the other modules. */
export abstract class UsersFacade {
  /** Looks up by email in the catalog. `undefined` if it does not exist. */
  abstract findByEmail(email: string): Promise<UserSnapshot | undefined>;
  /** @throws DomainError `IDENTITY.USER.NOT_FOUND` if it does not exist. */
  abstract getByRef(ref: UserRef): Promise<UserSnapshot>;
  /** The user's home tenant from the catalog, or `undefined` if it does not exist. */
  abstract refOf(userId: string): Promise<UserRef | undefined>;
  abstract register(input: RegisterUserInput): Promise<UserRef>;
  abstract setLastTenant(ref: UserRef, tenantId: string): Promise<void>;
  /** Points to `region` the email index of the users whose home tenant was moved. Idempotent. */
  abstract relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void>;
}
