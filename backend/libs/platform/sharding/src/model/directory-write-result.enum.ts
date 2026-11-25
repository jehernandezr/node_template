/** Result of a conditional write to the directory. */
export enum DirectoryWriteResult {
  Written = 'written',
  /** The stored version is not the one the writer read (or the tenant already exists): reread and retry. */
  VersionConflict = 'version-conflict',
  /**
   * The placement breaks a shard's exclusivity: a dedicated tenant would
   * share a shard, or a tenant would land on a dedicated tenant's shard. The
   * placement policy must run again with fresh data.
   */
  ShardTaken = 'shard-taken',
}
