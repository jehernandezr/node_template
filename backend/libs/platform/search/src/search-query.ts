/** A free-text search in a collection of the `ShardScope` tenant, with offset pagination. */
export interface SearchQuery {
  readonly collection: string;
  readonly text: string;
  readonly limit: number;
  readonly offset: number;
}
