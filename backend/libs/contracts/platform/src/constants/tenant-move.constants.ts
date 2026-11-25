/** Limits and timeouts of the operations that move a tenant between shards and regions. */
export const TenantMoveLimits = {
  /** Maximum length of the identifier of a shard group or a region. */
  targetMaxLength: 64,
  /** Maximum length of a PostgreSQL table name. */
  tableNameMaxLength: 63,
  /** Tables a service declares in its move manifest. */
  maxTables: 64,
  /** Maximum length of a table checksum (hexadecimal). */
  checksumMaxLength: 64,
  /** Timeout of a copy call: copies a bounded batch and returns the progress; the saga repeats until the round finishes. */
  syncTimeoutMs: 6_000,
  /** Timeout of a call of the final round and the verification, in batches like the copy. */
  finalizeTimeoutMs: 6_000,
  /** Timeout of a cancellation call, in batches. */
  abortTimeoutMs: 6_000,
  /** Timeout of a service's directory switch to the destination. */
  switchTimeoutMs: 6_000,
  /** Timeout of a source cleanup call, in batches. */
  cleanupTimeoutMs: 6_000,
} as const;
