import type { Secret } from '@platform/config';
import { DatabaseTokenProvider } from './ports/database-token-provider.js';

/** `DB_AUTH=password`: every connection presents the same `DB_PASSWORD`, whatever its host and user. */
export class PasswordDatabaseTokenProvider extends DatabaseTokenProvider {
  constructor(private readonly password: Secret) {
    super();
  }

  /**
   * Returns `DB_PASSWORD`.
   * @returns The password.
   */
  override token(): Promise<string> {
    return Promise.resolve(this.password.reveal());
  }
}
