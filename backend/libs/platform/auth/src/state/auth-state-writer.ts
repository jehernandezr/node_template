import type { RevocationReason } from '@contracts/identity';
import type { AccessGrant } from '../access/access-grant.js';
import type { ApiKeyPrincipal } from '../api-keys/api-key-principal.js';
import type { Epoch } from './epoch.js';

/** Escritura del estado compartido `auth:*`. Solo la usa identity. */
export abstract class AuthStateWriter {
  /**
   * Marca la sesión como revocada durante `ttlMs` (la vida restante del access
   * token más 30 s), la agrega al índice y avisa por el canal de revocaciones.
   */
  abstract revokeSession(
    sessionId: string,
    ttlMs: number,
    reason: RevocationReason,
  ): Promise<void>;

  abstract setUserEpoch(userId: string, epoch: Epoch): Promise<void>;

  abstract setTenantEpoch(tenantId: string, epoch: Epoch): Promise<void>;

  /** Con `userId` fija la versión del usuario en el tenant; sin él, la versión del tenant. */
  abstract setPermissionVersion(
    tenantId: string,
    userId: string | undefined,
    version: number,
  ): Promise<void>;

  /** Guarda el grant con un TTL de 15 minutos. */
  abstract putAccessGrant(
    tenantId: string,
    userId: string,
    grant: AccessGrant,
  ): Promise<void>;

  /** Guarda el principal bajo el hash del secreto, con un TTL de 60 segundos. */
  abstract putApiKey(
    prefix: string,
    secretHash: string,
    principal: ApiKeyPrincipal,
  ): Promise<void>;

  /** Borra la llave `auth:apikey:{prefix}`: así se revoca una API key. */
  abstract dropApiKey(prefix: string): Promise<void>;
}
