import type { ApiKeyPrincipal } from '@platform/auth';
import { InMemoryAuthState } from '@platform/auth/test-utils';

/**
 * Shared state that runs a step of another request right before the next API key write: this way a
 * test reproduces the race between authenticating and revoking without depending on timing.
 */
export class InterleavingAuthState extends InMemoryAuthState {
  private beforeNextPut: (() => Promise<void>) | undefined;

  interleave(step: () => Promise<void>): void {
    this.beforeNextPut = step;
  }

  override async putApiKey(
    prefix: string,
    secretHash: string,
    principal: ApiKeyPrincipal,
  ): Promise<void> {
    const step = this.beforeNextPut;
    this.beforeNextPut = undefined;
    await step?.();
    await super.putApiKey(prefix, secretHash, principal);
  }
}
