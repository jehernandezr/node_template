import type { PasswordCredential } from './password-credential.js';

/** Passwords in the user's shard. */
export abstract class PasswordCredentialRepository {
  /**
   * Reads the password of a user.
   * @param userId Owner.
   * @returns The credential, or `undefined`.
   */
  abstract find(userId: string): Promise<PasswordCredential | undefined>;

  /**
   * Inserts or replaces the user's password.
   * @param credential Credential to store.
   */
  abstract save(credential: PasswordCredential): Promise<void>;

  /**
   * Deletes the password of a user.
   * @param userId Owner.
   */
  abstract delete(userId: string): Promise<void>;
}
