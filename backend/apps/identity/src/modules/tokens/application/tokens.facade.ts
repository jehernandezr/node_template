import type { AccessTokenInput } from '../domain/access-token-input.js';
import type { IssuedAccessToken } from './issue-access-token.use-case.js';

/** Lo que `tokens` ofrece a los otros módulos. */
export abstract class TokensFacade {
  abstract issue(input: AccessTokenInput): Promise<IssuedAccessToken>;
}
