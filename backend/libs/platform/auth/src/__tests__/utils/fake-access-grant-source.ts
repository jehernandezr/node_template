import type { AccessGrant } from '../../access/access-grant.js';
import { AccessGrantSource } from '../../access/access-grant-source.js';

/** Fuente de grants de prueba: devuelve el grant fijado por usuario y cuenta las llamadas. */
export class FakeAccessGrantSource extends AccessGrantSource {
  /** Con valor, toda llamada falla con este error. */
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

  /** Fija el grant que devuelve `fetch(tenantId, userId)`. */
  set(tenantId: string, userId: string, grant: AccessGrant): void {
    this.grants.set(`${tenantId}:${userId}`, grant);
  }

  /** Veces que se llamó a `fetch`. */
  get fetchCount(): number {
    return this.fetched;
  }
}
