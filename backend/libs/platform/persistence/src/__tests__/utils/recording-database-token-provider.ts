import type { DatabaseTokenRequest } from '../../model/database-token-request.js';
import { DatabaseTokenProvider } from '../../ports/database-token-provider.js';

/**
 * Signer double: records every request and answers with the password it was given, or with a numbered token when it
 * was given none, so a test can count the connections that asked.
 */
export class RecordingDatabaseTokenProvider extends DatabaseTokenProvider {
  readonly requests: DatabaseTokenRequest[] = [];

  constructor(private readonly password?: string) {
    super();
  }

  /**
   * Records the request and returns the password, or `token-<n>` for the n-th request.
   * @param request Host, port and user of the connection.
   * @returns The password or the numbered token.
   */
  override token(request: DatabaseTokenRequest): Promise<string> {
    this.requests.push(request);
    return Promise.resolve(this.password ?? `token-${this.requests.length}`);
  }
}
