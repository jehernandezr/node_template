import type { Abstract, Type } from '@nestjs/common';
import type { AccessGrantSource } from '../access/access-grant-source.js';
import type { ApiKeyResolver } from '../api-keys/api-key-resolver.js';
import type { JwksKeySource } from '../jwks/jwks-key-source.js';
import type { AuthRevocationFeed } from '../state/auth-revocation-feed.js';
import type { AuthStateReader } from '../state/auth-state-reader.js';

/** Options of `AuthModule`: what is tuned without changing adapters. */
export interface AuthModuleOptions {
  /** In-memory lifetime of epochs, versions and grants. Defaults to `AuthModuleRules.DEFAULT_CACHE_TTL_MS`. */
  readonly cacheTtlMs?: number;
  /** Maximum entries of each local cache. Defaults to `AuthModuleRules.DEFAULT_CACHE_MAX_ENTRIES`. */
  readonly cacheMaxEntries?: number;
}

/**
 * Adapters of `AuthModule`, passed as a type. The module never imports an
 * adapter: the service names its own, for example `ValkeyAuthStateReader`.
 * Each class must be injectable from a global module (`ValkeyModule` is one).
 */
export interface AuthModuleExtras {
  /** Reader of the `auth:*` state; the module wraps it with the local caches. */
  readonly source: Type<AuthStateReader> | Abstract<AuthStateReader>;
  /** Revocation notices. */
  readonly feed: Type<AuthRevocationFeed> | Abstract<AuthRevocationFeed>;
  /** Source of truth for a user's access. */
  readonly accessGrants: Type<AccessGrantSource> | Abstract<AccessGrantSource>;
  /** Source of truth for API keys. Without it no API key is valid. */
  readonly apiKeyResolver?: Type<ApiKeyResolver> | Abstract<ApiKeyResolver>;
  /** Verification keys. Without it they are downloaded from `AUTH_JWKS_URL`. */
  readonly jwks?: Type<JwksKeySource> | Abstract<JwksKeySource>;
}
