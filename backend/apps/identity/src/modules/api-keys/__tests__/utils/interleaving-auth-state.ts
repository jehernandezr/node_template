import type { ApiKeyPrincipal } from '@platform/auth';
import { InMemoryAuthState } from '@platform/auth/test-utils';

/**
 * Estado compartido que corre un paso de otra petición justo antes de la siguiente escritura de una API
 * key: así una prueba reproduce la carrera entre autenticar y revocar sin depender del tiempo.
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
