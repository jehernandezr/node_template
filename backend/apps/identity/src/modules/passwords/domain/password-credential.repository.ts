import type { PasswordCredential } from './password-credential.js';

/** Passwords in the user's shard. */
export abstract class PasswordCredentialRepository {
  abstract find(userId: string): Promise<PasswordCredential | undefined>;

  /** Inserts or replaces the user's password. */
  abstract save(credential: PasswordCredential): Promise<void>;

  abstract delete(userId: string): Promise<void>;
}
