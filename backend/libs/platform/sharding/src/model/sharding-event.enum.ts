/** Eventos del directorio de sharding. El valor es el tipo CloudEvents. */
export enum ShardingEvent {
  /** Cambió un placement o el mapeo de un shard a su instancia. */
  ShardDirectoryChanged = 'platform.sharding.directory-changed.v1',
}
