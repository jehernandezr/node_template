/** Jobs periódicos de identity. */
export enum IdentityJob {
  /** Borra las reservas de `identity_lookup` de más de una hora sin usuario. */
  SweepReservedLookups = 'identity.sweep-reserved-lookups',
  /** Vuelca a Postgres el último uso de las API keys que acumuló Valkey. */
  FlushApiKeyUsage = 'identity.flush-api-key-usage',
  /** Crea las particiones mensuales de `login_attempts` y borra las de más de 12 meses. */
  RotateLoginAttemptPartitions = 'identity.rotate-login-attempt-partitions',
  /** Pasa a `Expired` las invitaciones vencidas. */
  ExpireInvitations = 'identity.expire-invitations',
  /** Borra las recuperaciones de contraseña vencidas o usadas hace más de su retención. */
  PurgePasswordResets = 'identity.purge-password-resets',
  /** Borra del origen los datos de los tenants trasladados cuando pasa `TENANT_MOVE_GRACE_DAYS`. */
  CleanUpTenantMoves = 'identity.clean-up-tenant-moves',
}
