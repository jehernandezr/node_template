import type { RevocationReason } from '@contracts/identity';
import type { AccessGrant } from '../../access/access-grant.js';
import type { ApiKeyPrincipal } from '../../api-keys/api-key-principal.js';
import { AuthRevocationFeed } from '../../state/auth-revocation-feed.js';
import { AuthStateReader } from '../../state/auth-state-reader.js';
import { AuthStateWriter } from '../../state/auth-state-writer.js';
import type { Epoch } from '../../state/epoch.js';
import type { PermissionVersion } from '../../state/permission-version.js';
import type { RevocationHandler } from '../../state/revocation-handler.js';

/**
 * Estado de autenticación en memoria: lector, escritor y aviso de revocaciones
 * en una sola clase, como si lector y escritor compartieran un Valkey. Para
 * pruebas; no entra al índice público.
 */
export class InMemoryAuthState
  implements AuthStateReader, AuthStateWriter, AuthRevocationFeed
{
  /** Cuántas veces se consultó cada operación de lectura, para verificar cachés. */
  readonly calls = new Map<string, number>();

  /** Con valor, toda lectura y escritura falla con este error: simula Valkey caído. */
  failure: Error | undefined;

  /** Motivo con el que se revocó cada sesión. */
  readonly revocationReasons = new Map<string, RevocationReason>();

  private readonly revoked = new Map<string, number>();
  private readonly userEpochs = new Map<string, Epoch>();
  private readonly tenantEpochs = new Map<string, Epoch>();
  private readonly tenantVersions = new Map<string, number>();
  private readonly userVersions = new Map<string, number>();
  private readonly grants = new Map<string, AccessGrant>();
  private readonly apiKeys = new Map<string, ApiKeyPrincipal>();
  private readonly handlers = new Set<RevocationHandler>();

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    this.touch('isSessionRevoked');
    return this.revoked.has(sessionId);
  }

  async *revokedSessionIds(): AsyncIterable<readonly string[]> {
    this.touch('revokedSessionIds');
    yield [...this.revoked.keys()];
  }

  async userEpoch(userId: string): Promise<Epoch | undefined> {
    this.touch('userEpoch');
    return this.userEpochs.get(userId);
  }

  async tenantEpoch(tenantId: string): Promise<Epoch | undefined> {
    this.touch('tenantEpoch');
    return this.tenantEpochs.get(tenantId);
  }

  async permissionVersion(
    tenantId: string,
    userId: string,
  ): Promise<PermissionVersion | undefined> {
    this.touch('permissionVersion');
    const tenant = this.tenantVersions.get(tenantId);
    const user = this.userVersions.get(`${tenantId}:${userId}`);
    return tenant === undefined || user === undefined
      ? undefined
      : { tenant, user };
  }

  async accessGrant(
    tenantId: string,
    userId: string,
  ): Promise<AccessGrant | undefined> {
    this.touch('accessGrant');
    return this.grants.get(`${tenantId}:${userId}`);
  }

  async apiKey(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined> {
    this.touch('apiKey');
    return this.apiKeys.get(`${prefix}:${secretHash}`);
  }

  async subscribe(handler: RevocationHandler): Promise<() => Promise<void>> {
    this.touch('subscribe');
    this.handlers.add(handler);
    return async () => {
      this.handlers.delete(handler);
    };
  }

  async revokeSession(
    sessionId: string,
    ttlMs: number,
    reason: RevocationReason,
  ): Promise<void> {
    this.touch('revokeSession');
    this.revoked.set(sessionId, ttlMs);
    this.revocationReasons.set(sessionId, reason);
    for (const handler of this.handlers) {
      handler(sessionId);
    }
  }

  async setUserEpoch(userId: string, epoch: Epoch): Promise<void> {
    this.touch('setUserEpoch');
    this.userEpochs.set(userId, epoch);
  }

  async setTenantEpoch(tenantId: string, epoch: Epoch): Promise<void> {
    this.touch('setTenantEpoch');
    this.tenantEpochs.set(tenantId, epoch);
  }

  async setPermissionVersion(
    tenantId: string,
    userId: string | undefined,
    version: number,
  ): Promise<void> {
    this.touch('setPermissionVersion');
    if (userId === undefined) {
      this.tenantVersions.set(tenantId, version);
    } else {
      this.userVersions.set(`${tenantId}:${userId}`, version);
    }
  }

  async putAccessGrant(
    tenantId: string,
    userId: string,
    grant: AccessGrant,
  ): Promise<void> {
    this.touch('putAccessGrant');
    this.grants.set(`${tenantId}:${userId}`, grant);
  }

  async putApiKey(
    prefix: string,
    secretHash: string,
    principal: ApiKeyPrincipal,
  ): Promise<void> {
    this.touch('putApiKey');
    this.apiKeys.set(`${prefix}:${secretHash}`, principal);
  }

  async dropApiKey(prefix: string): Promise<void> {
    this.touch('dropApiKey');
    for (const key of [...this.apiKeys.keys()]) {
      if (key.startsWith(`${prefix}:`)) {
        this.apiKeys.delete(key);
      }
    }
  }

  /** Veces que se llamó a una operación. */
  count(operation: string): number {
    return this.calls.get(operation) ?? 0;
  }

  private touch(operation: string): void {
    if (this.failure !== undefined) {
      throw this.failure;
    }
    this.calls.set(operation, this.count(operation) + 1);
  }
}
