/** What `ShardedMigrationRunner` did on a database. */
export interface MigrationReport {
  /** Name of the database: the shard id or the catalog name. */
  readonly database: string;
  /** Names of the migrations applied in this run (empty if it was already up to date). */
  readonly applied: readonly string[];
}
