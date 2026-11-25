import type { AccessTokenInput } from '../domain/access-token-input.js';
import type { IssuedAccessToken } from './issue-access-token.use-case.js';

/** What `tokens` offers to the other modules. */
export abstract class TokensFacade {
  abstract issue(input: AccessTokenInput): Promise<IssuedAccessToken>;
}
