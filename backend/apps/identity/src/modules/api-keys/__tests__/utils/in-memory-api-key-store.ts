import { createHmac } from 'node:crypto';
import {
  ApiKeyDirectory,
  ApiKeyRepository,
  ApiKeySecretHasher,
} from '../../domain/api-key-store.js';
import type { ApiKey } from '../../domain/api-key.js';
import type { ServiceAccount } from '../../domain/service-account.js';

/** Cuentas de servicio y keys de todos los tenants en memoria; el tenant no se filtra. */
export class InMemoryApiKeyRepository extends ApiKeyRepository {
  readonly accounts = new Map<string, ServiceAccount>();
  readonly keys = new Map<string, ApiKey>();
  readonly touched = new Map<string, Date>();

  async listServiceAccounts(): Promise<readonly ServiceAccount[]> {
    return [...this.accounts.values()];
  }

  async findServiceAccount(id: string): Promise<ServiceAccount | undefined> {
    return this.accounts.get(id);
  }

  async insertServiceAccount(account: ServiceAccount): Promise<void> {
    this.accounts.set(account.id, account);
  }

  async updateServiceAccount(account: ServiceAccount): Promise<void> {
    this.accounts.set(account.id, account);
  }

  async listKeys(serviceAccountId: string): Promise<readonly ApiKey[]> {
    return [...this.keys.values()].filter(
      (key) => key.snapshot().serviceAccountId === serviceAccountId,
    );
  }

  async findKey(id: string): Promise<ApiKey | undefined> {
    return this.keys.get(id);
  }

  async findKeyByPrefix(prefix: string): Promise<ApiKey | undefined> {
    return [...this.keys.values()].find(
      (key) => key.snapshot().prefix === prefix,
    );
  }

  async insertKey(key: ApiKey): Promise<void> {
    this.keys.set(key.snapshot().id, key);
  }

  async updateKey(key: ApiKey): Promise<void> {
    this.keys.set(key.snapshot().id, key);
  }

  async touchLastUsed(apiKeyId: string, at: Date): Promise<void> {
    const previous = this.touched.get(apiKeyId);
    if (previous === undefined || previous < at) {
      this.touched.set(apiKeyId, at);
    }
  }
}

/** El catálogo de prefijos en memoria. */
export class InMemoryApiKeyDirectory extends ApiKeyDirectory {
  private readonly tenants = new Map<string, string>();

  async register(prefix: string, tenantId: string): Promise<void> {
    this.tenants.set(prefix, tenantId);
  }

  async tenantOf(prefix: string): Promise<string | undefined> {
    return this.tenants.get(prefix);
  }
}

/** HMAC con una llave de prueba construida, igual que el adaptador real. */
export class TestApiKeySecretHasher extends ApiKeySecretHasher {
  private readonly key = ['llave', 'de', 'prueba'].join('-');

  hmac(secretSha256: string): string {
    return createHmac('sha256', this.key)
      .update(secretSha256)
      .digest('base64url');
  }

  matches(secretSha256: string, hmac: string): boolean {
    return this.hmac(secretSha256) === hmac;
  }
}
