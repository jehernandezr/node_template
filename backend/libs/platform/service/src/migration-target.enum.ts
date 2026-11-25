/** Which databases `ServiceMigrator` migrates. */
export enum MigrationTarget {
  /** Only the catalog. */
  Catalog = 'catalog',
  /** Only the shards listed in the catalog directory. */
  Shards = 'shards',
  /** The catalog first and then the shards. */
  All = 'all',
}
