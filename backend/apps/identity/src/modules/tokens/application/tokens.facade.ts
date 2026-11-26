import type { AccessTokenInput } from '../domain/access-token-input.js';
import type { IssuedAccessToken } from './issue-access-token.use-case.js';

/** Issues the access tokens of a session for the modules that open or refresh one. */
export abstract class TokensFacade {
  /**
   * Issues an access token for a session.
   * @param input Session, user, tenant and methods.
   * @returns The token and its expiry.
   */
  abstract issue(input: AccessTokenInput): Promise<IssuedAccessToken>;
}
