import type { Abstract, Type } from '@nestjs/common';
import type { AccessGrantSource } from '../access/access-grant-source.js';
import type { ApiKeyResolver } from '../api-keys/api-key-resolver.js';
import type { JwksKeySource } from '../jwks/jwks-key-source.js';
import type { AuthRevocationFeed } from '../state/auth-revocation-feed.js';
import type { AuthStateReader } from '../state/auth-state-reader.js';

/** Opciones de `AuthModule`: lo que se afina sin cambiar de adaptador. */
export interface AuthModuleOptions {
  /** Vida en memoria de épocas, versiones y grants. Por defecto `AuthModuleRules.DEFAULT_CACHE_TTL_MS`. */
  readonly cacheTtlMs?: number;
  /** Entradas máximas de cada caché local. Por defecto `AuthModuleRules.DEFAULT_CACHE_MAX_ENTRIES`. */
  readonly cacheMaxEntries?: number;
}

/**
 * Adaptadores de `AuthModule`, que se pasan como tipo. El módulo nunca importa un
 * adaptador: el servicio nombra los suyos, por ejemplo `ValkeyAuthStateReader`.
 * Cada clase debe poder inyectarse desde un módulo global (`ValkeyModule` lo es).
 */
export interface AuthModuleExtras {
  /** Lector del estado `auth:*`; el módulo lo envuelve con las cachés locales. */
  readonly source: Type<AuthStateReader> | Abstract<AuthStateReader>;
  /** Avisos de revocación. */
  readonly feed: Type<AuthRevocationFeed> | Abstract<AuthRevocationFeed>;
  /** Fuente de verdad del acceso de un usuario. */
  readonly accessGrants: Type<AccessGrantSource> | Abstract<AccessGrantSource>;
  /** Fuente de verdad de las API keys. Sin ella ninguna API key es válida. */
  readonly apiKeyResolver?: Type<ApiKeyResolver> | Abstract<ApiKeyResolver>;
  /** Claves de verificación. Sin ella se descargan de `AUTH_JWKS_URL`. */
  readonly jwks?: Type<JwksKeySource> | Abstract<JwksKeySource>;
}
