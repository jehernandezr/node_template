import type { AccessGrant } from '../../../access/access-grant.js';
import { AccessResolver } from '../../../access/access-resolver.js';

/** Resolutor de grants de prueba: devuelve `grant` o lanza `failure` si está fijado. */
export class StubAccessResolver extends AccessResolver {
  grant: AccessGrant | undefined;
  failure: Error | undefined;

  async resolve(): Promise<AccessGrant> {
    if (this.failure !== undefined) {
      throw this.failure;
    }
    if (this.grant !== undefined) {
      return this.grant;
    }
    throw new Error('no grant');
  }
}
