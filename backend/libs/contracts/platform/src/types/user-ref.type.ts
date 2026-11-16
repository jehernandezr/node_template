/**
 * Referencia a un usuario. El `homeTenantId` es el tenant donde viven sus datos
 * (ADR 0023): con él cualquier servicio enruta al shard del usuario.
 */
export interface UserRef {
  userId: string;
  homeTenantId: string;
}
