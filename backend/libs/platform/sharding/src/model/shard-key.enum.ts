/** Clave que elige el shard lógico dentro del grupo de shards de un tenant. */
export enum ShardKey {
  Tenant = 'tenant',
  User = 'user',
  Custom = 'custom',
}
