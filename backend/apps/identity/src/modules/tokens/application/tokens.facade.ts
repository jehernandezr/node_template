import type { AccessTokenInput } from '../domain/access-token-input.js';
import type { IssuedAccessToken } from './issue-access-token.use-case.js';

/** Issues the access tokens of a session for the modules that open or refresh one. */
export abstract class TokensFacade {
  abstract issue(input: AccessTokenInput): Promise<IssuedAccessToken>;
}
