import type { Permission } from '@contracts/identity';
import type { ApiKeyEnvironment } from './api-key-environment.enum.js';

/** Whom a valid API key represents. Instants are epoch in seconds. */
export interface ApiKeyPrincipal {
  readonly apiKeyId: string;
  readonly serviceAccountId: string;
  readonly tenantId: string;
  readonly environment: ApiKeyEnvironment;
  readonly permissions: readonly Permission[];
  /** Without a value, the key does not expire. */
  readonly expiresAt?: number;
}
