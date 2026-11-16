import type { AccessGrant } from '../access/access-grant.js';
import type { ApiKeyPrincipal } from '../api-keys/api-key-principal.js';
import type { Epoch } from './epoch.js';
import type { PermissionVersion } from './permission-version.js';

/**
 * Lectura del estado compartido `auth:*`. Es el puerto que ven los servicios;
 * `ValkeyAuthStateReader` lo implementa sobre Valkey y `CachedAuthStateReader`
 * lo envuelve con las cachés locales.
 */
export abstract class AuthStateReader {
  /** `true` si `auth:revoked:{sid}` existe. */
  abstract isSessionRevoked(sessionId: string): Promise<boolean>;

  /**
   * Los `sid` revocados que siguen vigentes, en lotes, leídos de `auth:revoked-index`
   * (puntaje mayor que ahora). Alimenta la reconstrucción del Bloom local.
   */
  abstract revokedSessionIds(
    signal?: AbortSignal,
  ): AsyncIterable<readonly string[]>;

  abstract userEpoch(userId: string): Promise<Epoch | undefined>;

  abstract tenantEpoch(tenantId: string): Promise<Epoch | undefined>;

  /** `undefined` si falta alguna de las dos llaves `auth:pv:*`. */
  abstract permissionVersion(
    tenantId: string,
    userId: string,
  ): Promise<PermissionVersion | undefined>;

  abstract accessGrant(
    tenantId: string,
    userId: string,
  ): Promise<AccessGrant | undefined>;

  /** El principal guardado bajo el campo `secretHash` del hash `auth:apikey:{prefix}`. */
  abstract apiKey(
    prefix: string,
    secretHash: string,
  ): Promise<ApiKeyPrincipal | undefined>;
}
