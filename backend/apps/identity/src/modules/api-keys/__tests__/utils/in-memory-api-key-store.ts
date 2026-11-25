import { createHmac } from 'node:crypto';
import {
  ApiKeyDirectory,
  ApiKeyRepository,
  ApiKeySecretHasher,
} from '../../domain/api-key-store.js';
import type { ApiKey } from '../../domain/api-key.js';
import type { ServiceAccount } from '../../domain/service-account.js';

/** Service accounts and keys of all tenants in memory; the tenant is not filtered. */
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

/** The in-memory prefix catalog. */
export class InMemoryApiKeyDirectory extends ApiKeyDirectory {
  private readonly entries = new Map<
    string,
    { tenantId: string; region: string }
  >();

  async register(
    prefix: string,
    tenantId: string,
    region: string,
  ): Promise<void> {
    this.entries.set(prefix, { tenantId, region });
  }

  async tenantOf(prefix: string): Promise<string | undefined> {
    return this.entries.get(prefix)?.tenantId;
  }

  async relocateTenant(tenantId: string, region: string): Promise<void> {
    for (const [prefix, entry] of this.entries) {
      if (entry.tenantId === tenantId) {
        this.entries.set(prefix, { tenantId, region });
      }
    }
  }
}

/** HMAC with a constructed test key, same as the real adapter. */
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
