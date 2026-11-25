/** `ShardedMigrationRunner` methods that `FakeMigrationRunner` records. */
export enum MigrationRunnerCall {
  Catalog = 'migrateCatalog',
  Shard = 'migrateShard',
  All = 'migrateAll',
}
