import type { Permission } from '@contracts/identity';
import type { ApiKeyEnvironment } from './api-key-environment.enum.js';

/** A quién representa una API key válida. Los instantes son epoch en segundos. */
export interface ApiKeyPrincipal {
  readonly apiKeyId: string;
  readonly serviceAccountId: string;
  readonly tenantId: string;
  readonly environment: ApiKeyEnvironment;
  readonly permissions: readonly Permission[];
  /** Sin valor, la key no vence. */
  readonly expiresAt?: number;
}
