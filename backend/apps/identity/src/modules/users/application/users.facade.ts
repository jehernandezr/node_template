import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { RegisterUserInput } from '../domain/register-user-input.js';
import type { UserSnapshot } from '../domain/user-snapshot.js';

/** Looks users up and registers them, and records their last and home tenant for the other modules. */
export abstract class UsersFacade {
  /**
   * Looks up by email in the catalog. `undefined` if it does not exist.
   * @param email Email to find.
   * @returns The user, or `undefined`.
   */
  abstract findByEmail(email: string): Promise<UserSnapshot | undefined>;
  /**
   * Reads a user that must exist.
   * @param ref User to read.
   * @returns The user.
   * @throws DomainError `IDENTITY.USER.NOT_FOUND` if it does not exist.
   */
  abstract getByRef(ref: UserRef): Promise<UserSnapshot>;
  /**
   * The user's home tenant from the catalog, or `undefined` if it does not exist.
   * @param userId User to find.
   * @returns Its reference, or `undefined`.
   */
  abstract refOf(userId: string): Promise<UserRef | undefined>;
  /**
   * Creates a user with its first password in the shard of its home tenant, for signup and accepted invitations.
   * @param input Email, password, name and home tenant.
   * @returns The new user.
   */
  abstract register(input: RegisterUserInput): Promise<UserRef>;
  /**
   * Records the last tenant the user worked in.
   * @param ref User.
   * @param tenantId Last tenant.
   */
  abstract setLastTenant(ref: UserRef, tenantId: string): Promise<void>;
  /**
   * Points to `region` the email index of the users whose home tenant was moved. Idempotent.
   * @param homeTenantId Moved home tenant.
   * @param region New region.
   */
  abstract relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void>;
}
