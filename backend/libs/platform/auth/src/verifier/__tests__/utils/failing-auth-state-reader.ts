import type { AccessGrant } from '../../../access/access-grant.js';
import type { ApiKeyPrincipal } from '../../../api-keys/api-key-principal.js';
import { AuthStateReader } from '../../../state/auth-state-reader.js';
import type { Epoch } from '../../../state/epoch.js';
import type { PermissionVersion } from '../../../state/permission-version.js';
import type { InMemoryAuthState } from '../../../__tests__/utils/in-memory-auth-state.js';

/** Lector que falla en una operación elegida y delega el resto en un estado en memoria. */
export class FailingAuthStateReader extends AuthStateReader {
  /** Operación que lanza `Error('down')`; `undefined` deja todas funcionando. */
  failOn: keyof AuthStateReader | undefined;

  constructor(private readonly inner: InMemoryAuthState) {
    super();
  }

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    this.check('isSessionRevoked');
    return this.inner.isSessionRevoked(sessionId);
  }

  revokedSessionIds(): AsyncIterable<readonly string[]> {
    this.check('revokedSessionIds');
    return this.inner.revokedSessionIds();
  }

  async userEpoch(userId: string): Promise<Epoch | undefined> {
    this.check('userEpoch');
    return this.inner.userEpoch(userId);
  }

  async tenantEpoch(tenantId: string): Promise<Epoch | undefined> {
    this.check('tenantEpoch');
    return this.inner.tenantEpoch(tenantId);
  }

  async permissionVersion(
    tenantId: string,
    userId: string,
  ): Promise<PermissionVersion | undefined> {
    this.check('permissionVersion');
    return this.inner.permissionVersion(tenantId, userId);
  }

  async accessGrant(
    tenantId: string,
    userId: string,
  ): Promise<AccessGrant | undefined> {
    this.check('accessGrant');
    return this.inner.accessGrant(tenantId, userId);
  }

  async apiKey(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined> {
    this.check('apiKey');
    return this.inner.apiKey(prefix, secretHash);
  }

  private check(operation: keyof AuthStateReader): void {
    if (this.failOn === operation) {
      throw new Error('down');
    }
  }
}
