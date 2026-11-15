/** Qué clase de base lógica es un destino: un shard del servicio o el catálogo global. */
export enum DatabaseKind {
  Shard = 'shard',
  Catalog = 'catalog',
}
