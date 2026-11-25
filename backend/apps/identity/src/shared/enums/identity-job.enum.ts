/** Identity's periodic jobs. */
export enum IdentityJob {
  /** Deletes `identity_lookup` reservations older than one hour without a user. */
  SweepReservedLookups = 'identity.sweep-reserved-lookups',
  /** Flushes to Postgres the API keys' last use accumulated in Valkey. */
  FlushApiKeyUsage = 'identity.flush-api-key-usage',
  /** Creates the monthly partitions of `login_attempts` and deletes those older than 12 months. */
  RotateLoginAttemptPartitions = 'identity.rotate-login-attempt-partitions',
  /** Moves expired invitations to `Expired`. */
  ExpireInvitations = 'identity.expire-invitations',
  /** Deletes password recoveries expired or used longer ago than their retention. */
  PurgePasswordResets = 'identity.purge-password-resets',
  /** Deletes from the source the data of moved tenants once `TENANT_MOVE_GRACE_DAYS` passes. */
  CleanUpTenantMoves = 'identity.clean-up-tenant-moves',
}
