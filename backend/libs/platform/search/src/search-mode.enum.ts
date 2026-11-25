/** `SearchIndex` adapter that `SEARCH_MODE` selects. */
export enum SearchMode {
  /** PostgreSQL full text (`tsvector`). */
  Text = 'text',
  /** Full text combined with pgvector semantic neighbors. */
  Hybrid = 'hybrid',
}
