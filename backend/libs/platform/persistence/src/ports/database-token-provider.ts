import type { DatabaseTokenRequest } from '../model/database-token-request.js';

/**
 * Gives the password a new PostgreSQL connection presents. The pool asks on every connection it opens, so a token
 * that expires (an RDS IAM token lasts 15 minutes) is never reused. `PasswordDatabaseTokenProvider` returns
 * `DB_PASSWORD`; the RDS signer adapter lives in `@platform/adapters-aws`.
 */
export abstract class DatabaseTokenProvider {
  /**
   * Returns the password for one new connection.
   * @param request Host, port and user of the connection.
   * @returns The password or token.
   */
  abstract token(request: DatabaseTokenRequest): Promise<string>;
}
