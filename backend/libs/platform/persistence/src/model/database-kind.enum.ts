/** What kind of logical database a target is: a service shard or the global catalog. */
export enum DatabaseKind {
  Shard = 'shard',
  Catalog = 'catalog',
}
