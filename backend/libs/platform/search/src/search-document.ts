/** Texto de un documento que se puede buscar dentro de su colección, en el tenant del `ShardScope`. */
export interface SearchDocument {
  readonly collection: string;
  readonly id: string;
  readonly text: string;
}
