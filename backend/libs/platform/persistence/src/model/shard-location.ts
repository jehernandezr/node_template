/** Where a logical shard lives. `ResolvedShard` from `@platform/sharding` also satisfies it. */
export interface ShardLocation {
  readonly logicalShard: string;
  readonly instance: string;
}
