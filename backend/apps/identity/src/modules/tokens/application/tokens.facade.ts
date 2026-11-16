import type { AccessTokenInput } from '../domain/access-token-input.js';

/** Lo que `tokens` ofrece a los otros módulos. */
export abstract class TokensFacade {
  abstract issue(
    input: AccessTokenInput,
  ): Promise<{ accessToken: string; accessExpiresAt: Date }>;
}
