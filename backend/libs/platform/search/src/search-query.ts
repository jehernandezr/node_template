/** Una búsqueda de texto libre en una colección del tenant del `ShardScope`, con paginación por desplazamiento. */
export interface SearchQuery {
  readonly collection: string;
  readonly text: string;
  readonly limit: number;
  readonly offset: number;
}
