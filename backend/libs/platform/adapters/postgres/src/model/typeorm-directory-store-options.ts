/** Opciones de `TypeOrmDirectoryStore`. */
export interface TypeOrmDirectoryStoreOptions {
  /**
   * Lee del primario del catálogo en lugar de la réplica. Útil en la región principal y en las sagas de traslado,
   * que no toleran el retraso de réplica. Por defecto `false`.
   */
  readonly readPrimary?: boolean;
}
