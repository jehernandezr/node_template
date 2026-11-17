import type { ApiKeySummary, ServiceAccountSummary } from '@contracts/identity';
import type { ApiKey } from '../domain/api-key.js';
import type { ServiceAccount } from '../domain/service-account.js';

/** Lo que responde el contrato de cuentas de servicio y API keys. */
export class ApiKeyViews {
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
