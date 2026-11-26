import type { UserRef } from '../../../shared/types/user-ref.type.js';
import type { Passkey } from './passkey.js';

/** Passkeys in the user's shard. */
export abstract class PasskeyRepository {
  /**
   * Reads every registered authenticator a user can sign in with.
   * @param userId Owner.
   * @returns Its passkeys.
   */
  abstract list(userId: string): Promise<readonly Passkey[]>;
  /**
   * Reads a passkey by its credential id.
   * @param userId Owner.
   * @param credentialId Credential id.
   * @returns The passkey, or `undefined`.
   */
  abstract findByCredential(
    userId: string,
    credentialId: string,
  ): Promise<Passkey | undefined>;
  /**
   * Stores a new passkey.
   * @param passkey Passkey to store.
   */
  abstract insert(passkey: Passkey): Promise<void>;
  /**
   * Saves the changes of a passkey.
   * @param passkey Passkey read earlier and changed.
   */
  abstract update(passkey: Passkey): Promise<void>;
  /**
   * Deletes a passkey.
   * @param userId Owner.
   * @param passkeyId Passkey to delete.
   * @returns The deleted passkey, or `undefined`.
   */
  abstract delete(
    userId: string,
    passkeyId: string,
  ): Promise<Passkey | undefined>;
}

/** Global credential index (`passkey_lookup`): passwordless sign-in reaches the shard through them. */
export abstract class PasskeyDirectory {
  /**
   * Records in the catalog which user and region a credential belongs to.
   * @param credentialId Credential id.
   * @param user Owner.
   * @param region Region of the user.
   */
  abstract register(
    credentialId: string,
    user: UserRef,
    region: string,
  ): Promise<void>;
  /**
   * Finds the owner of a credential.
   * @param credentialId Credential id.
   * @returns The owner, or `undefined`.
   */
  abstract ownerOf(credentialId: string): Promise<UserRef | undefined>;
  /**
   * Removes a credential from the catalog.
   * @param credentialId Credential id.
   */
  abstract remove(credentialId: string): Promise<void>;
  /**
   * Points to `region` the credentials of the users whose home tenant is `homeTenantId`.
   * @param homeTenantId Moved home tenant.
   * @param region New region.
   */
  abstract relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void>;
}
