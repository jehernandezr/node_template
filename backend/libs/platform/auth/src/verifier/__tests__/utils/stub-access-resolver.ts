import type { AccessGrant } from '../../../access/access-grant.js';
import { AccessResolver } from '../../../access/access-resolver.js';

/** Test grant resolver: returns `grant` or throws `failure` if set. */
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
