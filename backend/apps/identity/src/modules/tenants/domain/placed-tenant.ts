/** Where a tenant ended up in identity's shard directory. */
export interface PlacedTenant {
  readonly region: string;
  /** The tenant's identity logical shards. */
  readonly shards: readonly string[];
  readonly dedicated: boolean;
}
