import type { ApiKey } from './api-key.js';
import type { ServiceAccount } from './service-account.js';

/** Service accounts and API keys in the tenant shard. */
export abstract class ApiKeyRepository {
  /**
   * Lists the service accounts of the tenant in scope.
   * @returns The service accounts.
   */
  abstract listServiceAccounts(): Promise<readonly ServiceAccount[]>;
  /**
   * Reads a service account.
   * @param id Service account id.
   * @returns The account, or `undefined`.
   */
  abstract findServiceAccount(id: string): Promise<ServiceAccount | undefined>;
  /**
   * Stores a new service account.
   * @param account Account to store.
   */
  abstract insertServiceAccount(account: ServiceAccount): Promise<void>;
  /**
   * Saves the changes of a service account.
   * @param account Account read earlier and changed.
   */
  abstract updateServiceAccount(account: ServiceAccount): Promise<void>;

  /**
   * Reads every key, active or revoked, of one machine identity.
   * @param serviceAccountId Owner of the keys.
   * @returns The keys.
   */
  abstract listKeys(serviceAccountId: string): Promise<readonly ApiKey[]>;
  /**
   * Reads a key by id.
   * @param id Key id.
   * @returns The key, or `undefined`.
   */
  abstract findKey(id: string): Promise<ApiKey | undefined>;
  /**
   * Reads a key by its public prefix.
   * @param prefix Public prefix.
   * @returns The key, or `undefined`.
   */
  abstract findKeyByPrefix(prefix: string): Promise<ApiKey | undefined>;
  /**
   * Stores a new key.
   * @param key Key to store.
   */
  abstract insertKey(key: ApiKey): Promise<void>;
  /**
   * Saves the changes of a key.
   * @param key Key read earlier and changed.
   */
  abstract updateKey(key: ApiKey): Promise<void>;
  /**
   * Advances `last_used_at` if `at` is later, without going through the version: it is approximate data and must not
   * make a concurrent rotation or revocation fail.
   * @param apiKeyId Key that was used.
   * @param at Instant of the use.
   */
  abstract touchLastUsed(apiKeyId: string, at: Date): Promise<void>;
}

/** Global prefix index (`api_key_lookup`): with it a key reaches its tenant's shard. */
export abstract class ApiKeyDirectory {
  /**
   * Records in the catalog which tenant and region a prefix belongs to.
   * @param prefix Public prefix.
   * @param tenantId Owner tenant.
   * @param region Region of the tenant.
   */
  abstract register(
    prefix: string,
    tenantId: string,
    region: string,
  ): Promise<void>;
  /**
   * Finds the tenant of a prefix.
   * @param prefix Public prefix.
   * @returns The tenant, or `undefined`.
   */
  abstract tenantOf(prefix: string): Promise<string | undefined>;
  /**
   * Points the tenant's prefixes to `region` after moving it.
   * @param tenantId Moved tenant.
   * @param region New region.
   */
  abstract relocateTenant(tenantId: string, region: string): Promise<void>;
}

/** Stored fingerprint of the secret: HMAC with `IDENTITY_API_KEY_PEPPER` of the SHA-256 the services compute. */
export abstract class ApiKeySecretHasher {
  /**
   * Computes the stored HMAC of a secret's SHA-256.
   * @param secretSha256 SHA-256 of the secret.
   * @returns The HMAC to store.
   */
  abstract hmac(secretSha256: string): string;
  /**
   * Compares a secret's SHA-256 with a stored HMAC in constant time.
   * @param secretSha256 SHA-256 of the secret.
   * @param hmac Stored HMAC.
   * @returns `true` when they match.
   */
  abstract matches(secretSha256: string, hmac: string): boolean;
}
