/** Opciones de `CachedAuthStateReader`. */
export interface CachedAuthStateOptions {
  /** Cuánto vive en memoria una época o una versión de permisos. */
  readonly ttlMs: number;
  /** Entradas máximas por tipo de dato; al pasarse sale la menos usada. */
  readonly maxEntries: number;
}
