import { Clock } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { TokensFacade } from '../../application/tokens.facade.js';
import type { AccessTokenInput } from '../../domain/access-token-input.js';

const ACCESS_TTL_MS = 600_000;

/** In-memory access token issuer: the test token is `token-for-<sessionId>`. */
export class InMemoryTokensFacade extends TokensFacade {
  readonly issued: AccessTokenInput[] = [];

  constructor(private readonly clock: Clock = new FixedClock()) {
    super();
  }

  async issue(
    input: AccessTokenInput,
  ): Promise<{ accessToken: string; accessExpiresAt: Date }> {
    this.issued.push(input);
    return {
      accessToken: `token-for-${input.sessionId}`,
      accessExpiresAt: new Date(this.clock.now().getTime() + ACCESS_TTL_MS),
    };
  }
}
