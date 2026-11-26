import type { PasswordCredential } from '../../domain/password-credential.js';
import { PasswordCredentialRepository } from '../../domain/password-credential.repository.js';

/** Password credentials kept in memory by user. */
export class InMemoryPasswordCredentials extends PasswordCredentialRepository {
  readonly rows = new Map<string, PasswordCredential>();

  override async find(userId: string): Promise<PasswordCredential | undefined> {
    return this.rows.get(userId);
  }

  override async save(credential: PasswordCredential): Promise<void> {
    this.rows.set(credential.userId, credential);
  }

  override async delete(userId: string): Promise<void> {
    this.rows.delete(userId);
  }
}
