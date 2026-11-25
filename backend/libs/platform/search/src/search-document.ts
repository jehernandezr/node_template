/** Searchable text of a document within its collection, in the tenant of the `ShardScope`. */
export interface SearchDocument {
  readonly collection: string;
  readonly id: string;
  readonly text: string;
}
