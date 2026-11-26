import type { ApiKeySummary, ServiceAccountSummary } from '@contracts/identity';
import type { ApiKey } from '../domain/api-key.js';
import type { ServiceAccount } from '../domain/service-account.js';

/** What the service accounts and API keys contract responds. */
export class ApiKeyViews {
  /**
   * Builds the API view of a service account.
   * @param account Service account.
   * @returns Its summary.
   */
  static account(account: ServiceAccount): ServiceAccountSummary {
    return {
      id: account.id,
      name: account.name,
      permissions: [...account.permissions],
      status: account.status,
      pinnedApiVersion: account.pinnedApiVersion ?? null,
      createdAt: account.createdAt.toISOString(),
    };
  }

  /**
   * Builds the API view of a key, without its secret.
   * @param key API key.
   * @returns Its summary.
   */
  static key(key: ApiKey): ApiKeySummary {
    const state = key.snapshot();
    return {
      id: state.id,
      serviceAccountId: state.serviceAccountId,
      prefix: state.prefix,
      environment: state.environment,
      status: state.status,
      expiresAt: state.expiresAt?.toISOString() ?? null,
      validUntil: state.validUntil?.toISOString() ?? null,
      allowedCidrs: [...state.allowedCidrs],
      lastUsedAt: state.lastUsedAt?.toISOString() ?? null,
      createdAt: state.createdAt.toISOString(),
    };
  }
}
