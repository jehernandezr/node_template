import type { ApiKey } from './api-key.js';
import type { ServiceAccount } from './service-account.js';

/** Service accounts and API keys in the tenant shard. */
export abstract class ApiKeyRepository {
  abstract listServiceAccounts(): Promise<readonly ServiceAccount[]>;
  abstract findServiceAccount(id: string): Promise<ServiceAccount | undefined>;
  abstract insertServiceAccount(account: ServiceAccount): Promise<void>;
  abstract updateServiceAccount(account: ServiceAccount): Promise<void>;

  abstract listKeys(serviceAccountId: string): Promise<readonly ApiKey[]>;
  abstract findKey(id: string): Promise<ApiKey | undefined>;
  abstract findKeyByPrefix(prefix: string): Promise<ApiKey | undefined>;
  abstract insertKey(key: ApiKey): Promise<void>;
  abstract updateKey(key: ApiKey): Promise<void>;
  /**
   * Advances `last_used_at` if `at` is later, without going through the version: it is approximate data and must not
   * make a concurrent rotation or revocation fail.
   */
  abstract touchLastUsed(apiKeyId: string, at: Date): Promise<void>;
}

/** Global prefix index (`api_key_lookup`): with it a key reaches its tenant's shard. */
export abstract class ApiKeyDirectory {
  abstract register(
    prefix: string,
    tenantId: string,
    region: string,
  ): Promise<void>;
  abstract tenantOf(prefix: string): Promise<string | undefined>;
  /** Points the tenant's prefixes to `region` after moving it. */
  abstract relocateTenant(tenantId: string, region: string): Promise<void>;
}

/** Stored fingerprint of the secret: HMAC with `IDENTITY_API_KEY_PEPPER` of the SHA-256 the services compute. */
export abstract class ApiKeySecretHasher {
  abstract hmac(secretSha256: string): string;
  abstract matches(secretSha256: string, hmac: string): boolean;
}
