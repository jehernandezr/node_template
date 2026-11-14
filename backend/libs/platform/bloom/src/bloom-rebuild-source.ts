/** Lotes de ítems que leen de la fuente de verdad de un filtro, para reconstruirlo. */
export type BloomRebuildSource =
  AsyncIterable<readonly string[]> | Iterable<readonly string[]>;

/** Crea una fuente nueva en cada llamada: cada reconstrucción la lee desde el principio. */
export type BloomRebuildSourceFactory = () => BloomRebuildSource;
