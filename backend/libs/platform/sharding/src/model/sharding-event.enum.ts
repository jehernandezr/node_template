/** Sharding directory events. The value is the CloudEvents type. */
export enum ShardingEvent {
  /** A placement or the mapping of a shard to its instance changed. */
  ShardDirectoryChanged = 'platform.sharding.directory-changed.v1',
}
