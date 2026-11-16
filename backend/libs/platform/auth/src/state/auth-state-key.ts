/**
 * Llaves y canal del estado compartido de autenticación en Valkey (ADR 0022).
 * Van sin el prefijo del servicio: identity escribe y todos leen. Utilidad
 * pura, sin estado.
 */
export class AuthStateKey {
  /** Primer segmento de toda llave y canal; la ACL de Valkey se define sobre `auth:*`. */
  static readonly NAMESPACE = 'auth';

  /** Zset de `sid` con su vencimiento como puntaje: fuente de la reconstrucción del Bloom local. */
  static readonly REVOKED_INDEX = 'auth:revoked-index';

  /** Canal pub/sub con un aviso por cada sesión revocada; el mensaje es el `sid`. */
  static readonly REVOCATIONS_CHANNEL = 'auth:revocations';

  /** `auth:revoked:{sid}`: motivo de la revocación. */
  static revoked(sessionId: string): string {
    return `auth:revoked:${sessionId}`;
  }

  /** `auth:epoch:user:{userId}`. */
  static userEpoch(userId: string): string {
    return `auth:epoch:user:${userId}`;
  }

  /** `auth:epoch:tenant:{tenantId}`. */
  static tenantEpoch(tenantId: string): string {
    return `auth:epoch:tenant:${tenantId}`;
  }

  /** `auth:pv:tenant:{tenantId}`. */
  static tenantPermissionVersion(tenantId: string): string {
    return `auth:pv:tenant:${tenantId}`;
  }

  /** `auth:pv:user:{tenantId}:{userId}`. */
  static userPermissionVersion(tenantId: string, userId: string): string {
    return `auth:pv:user:${tenantId}:${userId}`;
  }

  /** `auth:access:{tenantId}:{userId}`. */
  static access(tenantId: string, userId: string): string {
    return `auth:access:${tenantId}:${userId}`;
  }

  /** `auth:apikey:{prefix}`: hash con un campo por `sha256(secreto)`. */
  static apiKey(prefix: string): string {
    return `auth:apikey:${prefix}`;
  }
}
