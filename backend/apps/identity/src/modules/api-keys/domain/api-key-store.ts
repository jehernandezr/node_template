import type { ApiKey } from './api-key.js';
import type { ServiceAccount } from './service-account.js';

/** Cuentas de servicio y API keys en el shard del tenant. */
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
   * Adelanta `last_used_at` si `at` es posterior, sin pasar por la versión: es un dato aproximado y no debe
   * hacer fallar una rotación o una revocación que corre a la vez.
   */
  abstract touchLastUsed(apiKeyId: string, at: Date): Promise<void>;
}

/** Índice global de prefijos (`api_key_lookup`): con él una key llega al shard de su tenant. */
export abstract class ApiKeyDirectory {
  abstract register(
    prefix: string,
    tenantId: string,
    region: string,
  ): Promise<void>;
  abstract tenantOf(prefix: string): Promise<string | undefined>;
  /** Apunta a `region` los prefijos del tenant después de trasladarlo. */
  abstract relocateTenant(tenantId: string, region: string): Promise<void>;
}

/** Huella guardada del secreto: HMAC con `IDENTITY_API_KEY_PEPPER` del SHA-256 que calculan los servicios. */
export abstract class ApiKeySecretHasher {
  abstract hmac(secretSha256: string): string;
  abstract matches(secretSha256: string, hmac: string): boolean;
}
