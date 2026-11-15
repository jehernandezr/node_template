/** Dónde vive un shard lógico. `ResolvedShard` de `@platform/sharding` también lo cumple. */
export interface ShardLocation {
  readonly logicalShard: string;
  readonly instance: string;
}
