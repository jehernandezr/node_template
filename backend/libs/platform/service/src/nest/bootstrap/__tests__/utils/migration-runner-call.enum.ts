/** Métodos de `ShardedMigrationRunner` que anota `FakeMigrationRunner`. */
export enum MigrationRunnerCall {
  Catalog = 'migrateCatalog',
  Shard = 'migrateShard',
  All = 'migrateAll',
}
