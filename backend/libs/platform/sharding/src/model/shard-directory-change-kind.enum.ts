/** Qué cambió en el directorio. */
export enum ShardDirectoryChangeKind {
  /** El placement de un tenant (región, grupo de shards o estado). */
  TenantPlacement = 'tenant-placement',
  /** La instancia física de un shard lógico (una saga `MoveShard`). */
  ShardInstance = 'shard-instance',
}
