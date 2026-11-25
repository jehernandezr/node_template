/** Options of `TypeOrmDirectoryStore`. */
export interface TypeOrmDirectoryStoreOptions {
  /**
   * Whether to read from the catalog primary instead of the replica. Useful in the main region and in the move sagas,
   * which do not tolerate replica lag. Defaults to `false`.
   */
  readonly readPrimary?: boolean;
}
