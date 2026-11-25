import type { Page } from '@contracts/platform';
import type { Permission } from '../enums/access.enum.js';
import type {
  ApiKeyEnvironment,
  ApiKeyStatus,
  ServiceAccountStatus,
} from '../enums/api-key.enum.js';

/** Non-human tenant identity that uses API keys. */
export interface ServiceAccountSummary {
  id: string;
  name: string;
  permissions: Permission[];
  status: ServiceAccountStatus;
  /** API version the account is pinned to, or null for the current one. */
  pinnedApiVersion: string | null;
  createdAt: string;
}

export type ServiceAccountPage = Page<ServiceAccountSummary>;

/** Creation of a service account. */
export interface CreateServiceAccountRequest {
  name: string;
  permissions: Permission[];
  pinnedApiVersion?: string;
}

/** Partial changes to a service account. */
export interface UpdateServiceAccountRequest {
  serviceAccountId: string;
  name?: string;
  permissions?: Permission[];
}

/** Deletion of a service account with its API keys. */
export interface DeleteServiceAccountRequest {
  serviceAccountId: string;
}

/**
 * API key without its secret. The secret is only shown when creating or rotating the key,
 * which is why this summary never includes it.
 */
export interface ApiKeySummary {
  id: string;
  serviceAccountId: string;
  /** Visible prefix of the key, to identify it in listings. */
  prefix: string;
  environment: ApiKeyEnvironment;
  status: ApiKeyStatus;
  expiresAt: string | null;
  /** End of validity of a rotated key. */
  validUntil: string | null;
  allowedCidrs: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export type ApiKeyPage = Page<ApiKeySummary>;

/** Listing of a service account's API keys. */
export interface ListApiKeysRequest {
  serviceAccountId: string;
  limit?: number;
  after?: string;
}

/** Creation of an API key. */
export interface CreateApiKeyRequest {
  serviceAccountId: string;
  environment: ApiKeyEnvironment;
  expiresAt?: string;
  allowedCidrs?: string[];
}

/** Created API key: the secret appears only in this response. */
export interface CreatedApiKey {
  apiKey: ApiKeySummary;
  secret: string;
}

/** Rotation of an API key: the previous one remains valid until its `validUntil`. */
export interface RotateApiKeyRequest {
  apiKeyId: string;
}

/** Immediate revocation of an API key. */
export interface RevokeApiKeyRequest {
  apiKeyId: string;
}

/** Input of the internal operation that validates an API key. */
export interface AuthenticateApiKeyInput {
  apiKey: string;
  clientIp?: string;
}

/** Principal that results from validating an API key. */
export interface ApiKeyPrincipal {
  apiKeyId: string;
  serviceAccountId: string;
  tenantId: string;
  permissions: Permission[];
  environment: ApiKeyEnvironment;
  expiresAt: string | null;
  pinnedApiVersion: string | null;
}

/** Payload of `identity.api-key.created.v1`. Does not include the secret. */
export interface ApiKeyCreatedPayload {
  apiKeyId: string;
  serviceAccountId: string;
  tenantId: string;
  prefix: string;
  environment: ApiKeyEnvironment;
  createdBy: string;
  createdAt: string;
}

/** Payload of `identity.api-key.revoked.v1`. */
export interface ApiKeyRevokedPayload {
  apiKeyId: string;
  tenantId: string;
  prefix: string;
  revokedAt: string;
}
