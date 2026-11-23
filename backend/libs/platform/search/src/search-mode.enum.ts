/** Adaptador de `SearchIndex` que elige `SEARCH_MODE`. */
export enum SearchMode {
  /** Texto completo de PostgreSQL (`tsvector`). */
  Text = 'text',
  /** Texto completo combinado con vecinos semánticos de pgvector. */
  Hybrid = 'hybrid',
}
