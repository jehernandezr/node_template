/** Qué bases migra `ServiceMigrator`. */
export enum MigrationTarget {
  /** Solo el catálogo. */
  Catalog = 'catalog',
  /** Solo los shards que lista el directorio del catálogo. */
  Shards = 'shards',
  /** El catálogo primero y luego los shards. */
  All = 'all',
}
