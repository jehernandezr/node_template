import type { AccessGrant } from '../../access/access-grant.js';
import { AccessGrantSource } from '../../access/access-grant-source.js';

/** Test grant source: returns the grant set per user and counts the calls. */
export class FakeAccessGrantSource extends AccessGrantSource {
  /** When set, every call fails with this error. */
  failure: Error | undefined;

  private readonly grants = new Map<string, AccessGrant>();
  private fetched = 0;

  async fetch(tenantId: string, userId: string): Promise<AccessGrant> {
    this.fetched += 1;
    if (this.failure !== undefined) {
      throw this.failure;
    }
    const grant = this.grants.get(`${tenantId}:${userId}`);
    if (grant === undefined) {
      throw new Error(`no grant for ${tenantId}:${userId}`);
    }
    return grant;
  }

  /** Sets the grant returned by `fetch(tenantId, userId)`. */
  set(tenantId: string, userId: string, grant: AccessGrant): void {
    this.grants.set(`${tenantId}:${userId}`, grant);
  }

  /** Number of times `fetch` was called. */
  get fetchCount(): number {
    return this.fetched;
  }
}
