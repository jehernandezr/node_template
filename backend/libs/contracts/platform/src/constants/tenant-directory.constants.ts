/** Limits and timeouts of the operations that place a tenant in a service's shard directory. */
export const TenantDirectoryLimits = {
  /** Maximum length of the identifier of a region or a shard group. */
  fieldMaxLength: 64,
  /** Shard groups of a tenant; the shared customer tenant occupies all of those in its region. */
  maxGroups: 64,
  /** Timeout for writing a directory row. */
  placeTimeoutMs: 5_000,
  /** Timeout for removing a directory row. */
  removeTimeoutMs: 5_000,
} as const;
