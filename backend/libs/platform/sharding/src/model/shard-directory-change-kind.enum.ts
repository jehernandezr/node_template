/** What changed in the directory. */
export enum ShardDirectoryChangeKind {
  /** The placement of a tenant (region, shard group or status). */
  TenantPlacement = 'tenant-placement',
  /** The physical instance of a logical shard (a `MoveShard` saga). */
  ShardInstance = 'shard-instance',
}
