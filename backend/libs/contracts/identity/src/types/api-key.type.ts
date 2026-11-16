import type { Page } from '@contracts/platform';
import type { Permission } from '../enums/access.enum.js';
import type {
  ApiKeyEnvironment,
  ApiKeyStatus,
  ServiceAccountStatus,
} from '../enums/api-key.enum.js';

/** Identidad no humana del tenant que usa API keys. */
export interface ServiceAccountSummary {
  id: string;
  name: string;
  permissions: Permission[];
  status: ServiceAccountStatus;
  /** Versión de la API a la que queda fijada la cuenta, o null para la actual. */
  pinnedApiVersion: string | null;
  createdAt: string;
}

export type ServiceAccountPage = Page<ServiceAccountSummary>;

/** Alta de una service account. */
export interface CreateServiceAccountRequest {
  name: string;
  permissions: Permission[];
  pinnedApiVersion?: string;
}

/** Cambios parciales de una service account. */
export interface UpdateServiceAccountRequest {
  serviceAccountId: string;
  name?: string;
  permissions?: Permission[];
}

/** Borrado de una service account con sus API keys. */
export interface DeleteServiceAccountRequest {
  serviceAccountId: string;
}

/**
 * API key sin secreto. El secreto solo se muestra al crear o rotar la clave,
 * por eso este resumen nunca lo incluye.
 */
export interface ApiKeySummary {
  id: string;
  serviceAccountId: string;
  /** Prefijo visible de la clave, para identificarla en listados. */
  prefix: string;
  environment: ApiKeyEnvironment;
  status: ApiKeyStatus;
  expiresAt: string | null;
  /** Fin de la validez de una clave rotada. */
  validUntil: string | null;
  allowedCidrs: string[];
  lastUsedAt: string | null;
  createdAt: string;
}

export type ApiKeyPage = Page<ApiKeySummary>;

/** Listado de las API keys de una service account. */
export interface ListApiKeysRequest {
  serviceAccountId: string;
  limit?: number;
  after?: string;
}

/** Alta de una API key. */
export interface CreateApiKeyRequest {
  serviceAccountId: string;
  environment: ApiKeyEnvironment;
  expiresAt?: string;
  allowedCidrs?: string[];
}

/** API key creada: el secreto aparece solo en esta respuesta. */
export interface CreatedApiKey {
  apiKey: ApiKeySummary;
  secret: string;
}

/** Rotación de una API key: la anterior sigue válida hasta su `validUntil`. */
export interface RotateApiKeyRequest {
  apiKeyId: string;
}

/** Revocación inmediata de una API key. */
export interface RevokeApiKeyRequest {
  apiKeyId: string;
}

/** Entrada de la operación interna que valida una API key. */
export interface AuthenticateApiKeyInput {
  apiKey: string;
  clientIp?: string;
}

/** Principal que resulta de validar una API key. */
export interface ApiKeyPrincipal {
  apiKeyId: string;
  serviceAccountId: string;
  tenantId: string;
  permissions: Permission[];
  environment: ApiKeyEnvironment;
  expiresAt: string | null;
  pinnedApiVersion: string | null;
}

/** Payload de `identity.api-key.created.v1`. No incluye el secreto. */
export interface ApiKeyCreatedPayload {
  apiKeyId: string;
  serviceAccountId: string;
  tenantId: string;
  prefix: string;
  environment: ApiKeyEnvironment;
  createdBy: string;
  createdAt: string;
}

/** Payload de `identity.api-key.revoked.v1`. */
export interface ApiKeyRevokedPayload {
  apiKeyId: string;
  tenantId: string;
  prefix: string;
  revokedAt: string;
}
