/** Key that picks the logical shard within a tenant's shard group. */
export enum ShardKey {
  Tenant = 'tenant',
  User = 'user',
  Custom = 'custom',
}
